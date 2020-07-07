import { Page } from 'puppeteer';
import { withPage } from 'puppeteer-brillo';
import RefParser from 'json-schema-ref-parser';
import chalk from 'chalk';

function makeStyles({ messageNameWidth }: { messageNameWidth: number }): string {
  return `
  .border {
    stroke-width:2;
    stroke: rgb(0,0,0);
    fill:white;
  }
  .message-name-background {
    stroke-width:1;
    stroke:rgb(0,0,0);
    fill:aqua;
    width: ${messageNameWidth}px;
    height: 40px;
  }
  .message-name {
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

function sizeInBrowser(t: string, styles: string): DOMRect {
  const svg = document.createElement('svg');
  const style = document.createElement('style');
  style.innerHTML = styles;
  svg.appendChild(style);
  const g = document.createElement('g');
  g.innerHTML = t;
  const id = `${Math.round(Math.random() * 10000)}`;
  g.setAttribute('data-id', id);
  svg.appendChild(g);
  document.body.appendChild(svg);
  const el = document.querySelector<SVGTextElement>(`[data-id="${id}"] > *`);
  return el!.getBBox();
}

async function makeTitleBox(page: Page, { title, version }: { title: string; version: string }): Promise<{ messageName: string; width: number }> {
  const text = `<text x="2" y="28" dx="4" class="message-name">
  ${title}
  <tspan class="version">${version}</tspan>
  </text>`;
  const size = await page.evaluate(sizeInBrowser, text, makeStyles({ messageNameWidth: 42 }));
  return { messageName: text, width: size.width };
}

interface AttributesNode {
  attributes: string;
  width: number;
}
async function makeAttributes(page: Page, message: any): Promise<AttributesNode> {
  const title = message.info.title;
  const schemas = message.components.schemas;
  const attrs = _makeAttributes(schemas[title], { name: title, indent: 0 })
    .map(([indent, contents], ix) => `<tspan x="${indent * 12 + 16}" dy="${ix === 0 ? '.6' : '1.2'}em">${contents}</tspan>`)
    .join('\n');
  const text = `<text class="attributes" y="60">${attrs}</text>`;
  const size = await page.evaluate(sizeInBrowser, text);
  return {
    attributes: text,
    width: size.width,
  };
}

function warn(msg: string) {
  console.log(chalk.yellow(msg));
}

const PRIMITIVE_TYPES = ['string', 'integer', 'number'];
export function _makeAttributes(schema: any, { indent, name }: { name: string; indent: number; }): [number, string][] {
  if (schema.type === 'object') {
    return [
      [indent, `${name}: object of`],
      ...Object.keys(schema.properties).flatMap(k => _makeAttributes(schema.properties[k], { name: k, indent: indent + 1 }))
    ];
  } else if (schema['x-enumNames']) {
    return [
      [indent, `${name}: enum of`],
      ...schema['x-enumNames'].map((n: string) => ([indent + 1, n])),
    ];
  } else if (PRIMITIVE_TYPES.includes(schema.type)) {
    return [[indent, `${name}: ${schema.type}`]];
  } else if (schema.type === 'array' && schema.items && PRIMITIVE_TYPES.includes(schema.items.type)) {
    // specialization for array of primitive
    return [[indent, `${name}: array of ${schema.items.type}`]];
  } else if (schema.type === 'array' && schema.items && schema.items.type === 'object') {
    return [
      [indent, `${name}: array of objects with`],
      ...Object.keys(schema.items.properties).flatMap(k => _makeAttributes(schema.items.properties[k], { name: k, indent: indent + 1 }))
    ];
  } else if (schema.type === 'array' && Array.isArray(schema.items)) {
    // specialization for tuple
    return [
      [indent, `${name}: tuple of`],
      ...schema.items.flatMap((i: any, ix: number) => _makeAttributes(i, { indent: indent + 1, name: `${ix}` })),
    ];
  } else if (schema.type === 'array') {
    return [
      [indent, `${name}: array of`],
      ..._makeAttributes(schema.items, { indent: indent + 1, name: name + '.[]' })
    ];
  }
  warn(`schema ${name} did not match a rule, so nothing was output`);
  return [];
}

export async function createSvg(message: any): Promise<string> {
  const svgHeight = 300, svgWidth = 400;
  return withPage(async (page) => {
    const title = await makeTitleBox(page, { title: message.info.title, version: message.info.version });
    return `
    <svg width="${svgWidth}" height="${svgHeight}">
    <style>
    ${makeStyles({ messageNameWidth: title.width })}
    </style>
    <rect
    x="2" y="2" width="${svgWidth - 4}" height="${svgHeight - 4}"
    class="border"
    ></rect>
    <rect
    class="message-name-background"
    x="2" y="2"
    ></rect>

    <text class="attributes" y="60">
    <tspan x="16" dy=".6em" >&mdash; MenuItemsVersion: string</tspan>
    <tspan x="16" dy="1.2em">&mdash; MenuItems: array of</tspan>
    <tspan x="16" dy="1.2em">
    <tspan x="28" dy="1.2em">&mdash; name: string</tspan>
    <tspan x="28" dy="1.2em">&mdash; id: string</tspan>
    <tspan x="28" dy="1.2em">&mdash; price: number</tspan>
    <tspan x="28" dy="1.2em">&mdash; diet: enum of</tspan>
    <tspan x="28" dy="1.2em">
    <tspan x="40" dy="1.2em">&mdash; Vegan</tspan>
    <tspan x="40" dy="1.2em">&mdash; Vegetarian</tspan>
    <tspan x="40" dy="1.2em">&mdash; Meaty</tspan>
    </tspan>
    </tspan>
    </text>
    </svg>

    `;
  });
}
