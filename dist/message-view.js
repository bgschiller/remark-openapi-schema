"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemaToSvg = exports.createSvg = exports.enumNames = exports._makeAttributes = void 0;
const puppeteer_brillo_1 = require("puppeteer-brillo");
const json_schema_ref_parser_1 = __importDefault(require("json-schema-ref-parser"));
const chalk_1 = __importDefault(require("chalk"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
function makeStyles({ messageNameWidth, svgHeight, svgWidth }) {
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
function sizeInBrowser(t) {
    return puppeteer_brillo_1.withPage(async (page) => {
        await page.setContent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000">
        <style>
          ${BASE_STYLES}
        </style>
        <g>${t}</g>
      </svg>
    `);
        const size = await page.evaluate(() => {
            const el = document.querySelector(`g > *`);
            const box = el.getBBox();
            return {
                height: box.height,
                width: box.width,
            };
        });
        return size;
    });
}
async function makeTitleBox({ title, version }) {
    const text = `<text x="2" y="28" dx="4" class="message-name">
  ${title}
  <tspan class="version">${version}</tspan>
  </text>`;
    const size = await sizeInBrowser(text);
    return { messageName: text, width: size.width + 10 };
}
async function makeAttributes(message, { enumNameToOptions }) {
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
function warn(msg) {
    console.log(chalk_1.default.yellow(msg));
}
const PRIMITIVE_TYPES = ['string', 'integer', 'number', 'boolean'];
function _makeAttributes(schema, { indent, name, enumNameToOptions }) {
    if (schema.type === 'object') {
        return [
            [indent, `${name}: object of`],
            ...Object.keys(schema.properties).flatMap(k => _makeAttributes(schema.properties[k], { name: k, indent: indent + 1, enumNameToOptions }))
        ];
    }
    else if (schema['x-enumName']) {
        return [
            [indent, `${name}: enum of`],
            ...(schema['x-enumNames'] || enumNameToOptions[schema['x-enumName']]).map((n) => ([indent + 1, n])),
        ];
    }
    else if (PRIMITIVE_TYPES.includes(schema.type)) {
        return [[indent, `${name}: ${schema.type}`]];
    }
    else if (schema.type === 'array' && schema.items && PRIMITIVE_TYPES.includes(schema.items.type)) {
        // specialization for array of primitive
        return [[indent, `${name}: array of ${schema.items.type}`]];
    }
    else if (schema.type === 'array' && schema.items && schema.items.type === 'object') {
        return [
            [indent, `${name}: array of objects with`],
            ...Object.keys(schema.items.properties).flatMap(k => _makeAttributes(schema.items.properties[k], { name: k, indent: indent + 1, enumNameToOptions }))
        ];
    }
    else if (schema.type === 'array' && Array.isArray(schema.items)) {
        // specialization for tuple
        return [
            [indent, `${name}: tuple of`],
            ...schema.items.flatMap((i, ix) => _makeAttributes(i, { indent: indent + 1, name: `${ix}`, enumNameToOptions })),
        ];
    }
    else if (schema.type === 'array') {
        return [
            [indent, `${name}: array of`],
            ..._makeAttributes(schema.items, { indent: indent + 1, name: name + '.[]', enumNameToOptions })
        ];
    }
    warn(`schema ${name} did not match a rule, so nothing was output`);
    return [];
}
exports._makeAttributes = _makeAttributes;
function enumNames(message) {
    // the code generator apparently does things in a bass-ackwards way:
    // https://github.com/TBCTSystems/bct-common-device-standard-messages/commit/c0dd075d9c1e8ffe5acbaf103fc7ccabbe358b6e#diff-89cbd1b59e63e5442fac6337fd997ae97602ee3dce4e192e600ef97d372f4f5e
    // and avoids using x-enumNames in a sane way.
    // instead, it looks up the enum by name (I guess?)
    // This function adapts the x-enumNames value so it can be found by our code.
    var _a, _b, _c;
    const enumerations = (_c = (_b = (_a = message.components) === null || _a === void 0 ? void 0 : _a.schemas) === null || _b === void 0 ? void 0 : _b.ProjectEnumerations) === null || _c === void 0 ? void 0 : _c.properties;
    const nameToEnumOptions = enumerations && Object.fromEntries(Object.values(enumerations)
        .filter((p) => p['x-enumName'])
        .map((p) => [p['x-enumName'], p['x-enumNames']]));
    return nameToEnumOptions || {};
}
exports.enumNames = enumNames;
async function createSvg(message_) {
    const message = await json_schema_ref_parser_1.default.default.dereference(message_);
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
exports.createSvg = createSvg;
function schemaToSvg(messageFile, destination) {
    const svgFilename = path_1.default.join(destination, path_1.default.basename(messageFile, 'yaml') + 'svg');
    const completion = fs_1.promises.readFile(messageFile, 'utf-8')
        .then(js_yaml_1.default.safeLoad)
        .then(createSvg)
        .then((svg) => fs_1.promises.writeFile(svgFilename, svg, 'utf-8'));
    return { filename: svgFilename, completion };
}
exports.schemaToSvg = schemaToSvg;
