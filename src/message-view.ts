import { Page } from 'puppeteer';
import { withPage } from 'puppeteer-brillo';
import RefParser from 'json-schema-ref-parser';
import chalk from 'chalk';
import yaml from 'js-yaml';
import { promises as fs } from 'fs';
import path from 'path';

interface MakeStylesParams {
  messageNameWidth: number;
  svgHeight: number;
  svgWidth: number;
}
function makeStyles({ messageNameWidth, svgHeight, svgWidth}: MakeStylesParams): string {
  return `.border {
  stroke-width:2;
  stroke: rgb(0,0,0);
  fill:white;
  height: ${svgHeight - 4}px;
  width: ${svgWidth - 4}px;
}
.message-name-background {
  stroke-width:1;
  stroke:rgb(0,0,0);
  fill:rgb(3,166,120);
  width: ${messageNameWidth}px;
  height: 40px;
}
.message-name {
  fill: rgb(255,255,255);
  font-family: "Lucida Console", Monaco, monospace;
  font-weight: bold;
  font-size: 20;
}
.version {
  font-weight: normal;
  font-size: 12;
}
.attributes {
  font-family: "Lucida Console", Monaco, monospace;
  font-size: 16;
}`;
}
const BASE_STYLES = makeStyles({ messageNameWidth: 0, svgHeight: 1000, svgWidth: 1000 });

function sizeInBrowser(t: string): Promise<{height: number; width: number}> {
  return withPage(async (page) => {
    await page.setContent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
        <style>
          ${BASE_STYLES}
        </style>
        <g>${t}</g>
      </svg>
    `);
    const size = await page.evaluate(() => {
        const el = document.querySelector<SVGTextElement>(`g > *`);
        const box = el!.getBBox();
        return {
          height: box.height,
          width: box.width,
        };
    });
    return size;
  });
}

async function makeTitleBox({ title, version }: { title: string; version: string }): Promise<{ messageName: string; width: number }> {
  const text = `<text x="2" y="28" dx="4" class="message-name">
  ${title}
  <tspan class="version">${version}</tspan>
  </text>`;
  const size = await sizeInBrowser(text);
  return { messageName: text, width: size.width + 10 };
}

interface AttributesNode {
  text: string;
  width: number;
  height: number;
}
async function makeAttributes(message: any, { enumNameToOptions }: { enumNameToOptions: { [k: string]: string[] } }): Promise<AttributesNode> {
  const title = message.info.title;
  const schemas = message.components.schemas;
  const attrs = _makeAttributes(schemas[title], { name: title, indent: 0, enumNameToOptions })
    .slice(1) // strip off first object's name
    .map(([indent, contents], ix) => `<tspan x="${indent * 12 + 4}" dy="${ix === 0 ? '.6' : '1.2'}em">- ${contents}</tspan>`)
    .join('\n');
  const text = `<text class="attributes" y="60">${attrs}</text>`;
  const size = await sizeInBrowser(text);
  return {
    text,
    width: size.width + 32,
    height: size.height,
  };
}

function warn(msg: string) {
  console.log(chalk.yellow(msg));
}

const PRIMITIVE_TYPES = ['string', 'integer', 'number', 'boolean'];
export function _makeAttributes(schema: any, { indent, name, enumNameToOptions }: { name: string; indent: number; enumNameToOptions: { [k: string]: string[] } }): [number, string][] {
  if (schema.type === 'object') {
    return [
      [indent, `${name}: object of`],
      ...Object.keys(schema.properties).flatMap(k => _makeAttributes(schema.properties[k], { name: k, indent: indent + 1, enumNameToOptions }))
    ];
  } else if (schema['x-enumName']) {
    return [
      [indent, `${name}: enum of`],
      ...(schema['x-enumNames'] || enumNameToOptions[schema['x-enumName']]).map((n: string) => ([indent + 1, n])),
    ];
  } else if (PRIMITIVE_TYPES.includes(schema.type)) {
    return [[indent, `${name}: ${schema.type}`]];
  } else if (schema.type === 'array' && schema.items && PRIMITIVE_TYPES.includes(schema.items.type)) {
    // specialization for array of primitive
    return [[indent, `${name}: array of ${schema.items.type}`]];
  } else if (schema.type === 'array' && schema.items && schema.items.type === 'object') {
    return [
      [indent, `${name}: array of objects with`],
      ...Object.keys(schema.items.properties).flatMap(k => _makeAttributes(schema.items.properties[k], { name: k, indent: indent + 1, enumNameToOptions }))
    ];
  } else if (schema.type === 'array' && Array.isArray(schema.items)) {
    // specialization for tuple
    return [
      [indent, `${name}: tuple of`],
      ...schema.items.flatMap((i: any, ix: number) => _makeAttributes(i, { indent: indent + 1, name: `${ix}`, enumNameToOptions })),
    ];
  } else if (schema.type === 'array') {
    return [
      [indent, `${name}: array of`],
      ..._makeAttributes(schema.items, { indent: indent + 1, name: name + '.[]', enumNameToOptions })
    ];
  }
  warn(`schema ${name} did not match a rule, so nothing was output`);
  return [];
}

export function enumNames(message: any): any {
  // the code generator apparently does things in a bass-ackwards way:
  // https://github.com/TBCTSystems/bct-common-device-standard-messages/commit/c0dd075d9c1e8ffe5acbaf103fc7ccabbe358b6e#diff-89cbd1b59e63e5442fac6337fd997ae97602ee3dce4e192e600ef97d372f4f5e
  // and avoids using x-enumNames in a sane way.
  // instead, it looks up the enum by name (I guess?)
  // This function adapts the x-enumNames value so it can be found by our code.

  const enumerations =
    message.components?.schemas?.ProjectEnumerations?.properties;
  const nameToEnumOptions = enumerations && Object.fromEntries(
    Object.values(enumerations)
      .filter((p: any) => p['x-enumName'])
      .map((p: any) => [p['x-enumName'], p['x-enumNames']])
  );
  return nameToEnumOptions || {};
}

export async function createSvg(message_: any): Promise<string> {
  const message = await RefParser.default.dereference(message_);
  const enumNameToOptions = enumNames(message);
  const title = await makeTitleBox({
    title: message.info.title,
    version: message.components.schemas[message.info.title]['x-aggregate-version'],
  });
  const attributes = await makeAttributes(message, { enumNameToOptions });
  const svgHeight = attributes.height + 80;
  const svgWidth = Math.max(attributes.width, title.width) + 10;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}">
  <style>
    ${makeStyles({ messageNameWidth: title.width, svgHeight, svgWidth })}
  </style>
  <rect x="2" y="2" class="border"></rect>
  <rect class="message-name-background" x="2" y="2"></rect>
  ${title.messageName}
  ${attributes.text}
</svg>
`;
}

export function schemaToSvg(messageFile: string, destination: string): { filename: string, completion: Promise<void>} {
  const svgFilename = path.join(destination, path.basename(messageFile, 'yaml') + 'svg');
  const completion = fs.readFile(messageFile, 'utf-8')
    .then(yaml.safeLoad)
    .then(createSvg)
    .then((svg) => fs.writeFile(svgFilename, svg, 'utf-8'));
  return { filename: svgFilename, completion };
}
