'use strict';

import remark from 'remark';
import path from 'path';
import vfile from 'vfile';
const linkMessageViews = require('./index');
import emptyPromise from 'empty-promise';
import * as fs from 'fs-extra';

function mkCb<T = any>() {
  const p = emptyPromise<T>();
  return {
    p,
    cb: (err: Error | null, value: T) => {
      if (err) return p.reject(err);
      return p.resolve(value);
    },
  };
}

describe('remark-inline-links', () => {
  const runtimeDir = path.join(__dirname, 'runtime');

  beforeEach(() => fs.emptyDir('src/runtime/images'));

  it('picks up new images', async () => {
    const { p, cb } = mkCb();
    const input = vfile({
      contents: `
![](../fixtures/PrepareSandwich.yaml)
`,
      path: path.join(runtimeDir, 'test.md'),
    });
    remark().use(linkMessageViews).process(input, cb);
    const file = await p;
    expect(file.contents).toMatchInlineSnapshot(`
      "[![](images/PrepareSandwich.svg)](../fixtures/PrepareSandwich.yaml)
      "
    `);
    const svg = await fs.readFile(
      path.join(__dirname, 'runtime/images/PrepareSandwich.svg'),
      'utf-8'
    );
    expect(svg).toMatchInlineSnapshot(`
      "
      <svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"330.046875\\" height=\\"117.21875\\">
        <style>
          .border {
        stroke-width:2;
        stroke: rgb(0,0,0);
        fill:white;
        height: 113.21875px;
        width: 326.046875px;
      }
      .message-name-background {
        stroke-width:1;
        stroke:rgb(0,0,0);
        fill:rgb(3,166,120);
        width: 238.046875px;
        height: 40px;
      }
      .message-name {
        fill: rgb(255,255,255);
        font-family: \\"Lucida Console\\", Monaco, monospace;
        font-weight: bold;
        font-size: 20;
      }
      .version {
        font-weight: normal;
        font-size: 12;
      }
      .attributes {
        font-family: \\"Lucida Console\\", Monaco, monospace;
        font-size: 16;
      }
        </style>
        <rect x=\\"2\\" y=\\"2\\" class=\\"border\\"></rect>
        <rect class=\\"message-name-background\\" x=\\"2\\" y=\\"2\\"></rect>
        <text x=\\"2\\" y=\\"28\\" dx=\\"4\\" class=\\"message-name\\">
        PrepareSandwich
        <tspan class=\\"version\\">1.0.0</tspan>
        </text>
        <text class=\\"attributes\\" y=\\"60\\"><tspan x=\\"16\\" dy=\\".6em\\">- SandwichMenuVersion: string</tspan>
      <tspan x=\\"16\\" dy=\\"1.2em\\">- SandwichId: string</tspan></text>
      </svg>
      "
    `);
    expect(file.messages[0].message).toBe(
      'new yaml link found: ../fixtures/PrepareSandwich.yaml'
    );
  });

  it('recompiles old images', async () => {
    const { p, cb } = mkCb();
    const input = vfile({
      contents: `
[![](images/UpdateSandwichMenu.svg)](../fixtures/UpdateSandwichMenu.yaml)
`,
      path: path.join(runtimeDir, 'test.md'),
    });

    remark().use(linkMessageViews).process(input, cb);
    const file = await p;
    expect(file.contents).toBe(input.contents);
    const svg = await fs.readFile(
      path.join(__dirname, 'runtime/images/UpdateSandwichMenu.svg'),
      'utf-8'
    );
    expect(svg).toMatchInlineSnapshot(`
      "
      <svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"378.0625\\" height=\\"251.609375\\">
        <style>
          .border {
        stroke-width:2;
        stroke: rgb(0,0,0);
        fill:white;
        height: 247.609375px;
        width: 374.0625px;
      }
      .message-name-background {
        stroke-width:1;
        stroke:rgb(0,0,0);
        fill:rgb(3,166,120);
        width: 274.046875px;
        height: 40px;
      }
      .message-name {
        fill: rgb(255,255,255);
        font-family: \\"Lucida Console\\", Monaco, monospace;
        font-weight: bold;
        font-size: 20;
      }
      .version {
        font-weight: normal;
        font-size: 12;
      }
      .attributes {
        font-family: \\"Lucida Console\\", Monaco, monospace;
        font-size: 16;
      }
        </style>
        <rect x=\\"2\\" y=\\"2\\" class=\\"border\\"></rect>
        <rect class=\\"message-name-background\\" x=\\"2\\" y=\\"2\\"></rect>
        <text x=\\"2\\" y=\\"28\\" dx=\\"4\\" class=\\"message-name\\">
        UpdateSandwichMenu
        <tspan class=\\"version\\">1.0.0</tspan>
        </text>
        <text class=\\"attributes\\" y=\\"60\\"><tspan x=\\"16\\" dy=\\".6em\\">- MenuItemsVersion: string</tspan>
      <tspan x=\\"16\\" dy=\\"1.2em\\">- MenuItems: array of objects with</tspan>
      <tspan x=\\"28\\" dy=\\"1.2em\\">- name: string</tspan>
      <tspan x=\\"28\\" dy=\\"1.2em\\">- price: number</tspan>
      <tspan x=\\"28\\" dy=\\"1.2em\\">- id: string</tspan>
      <tspan x=\\"28\\" dy=\\"1.2em\\">- diet: enum of</tspan>
      <tspan x=\\"40\\" dy=\\"1.2em\\">- Vegan</tspan>
      <tspan x=\\"40\\" dy=\\"1.2em\\">- Vegetarian</tspan>
      <tspan x=\\"40\\" dy=\\"1.2em\\">- Meaty</tspan></text>
      </svg>
      "
    `);
    expect(file.messages[0].message).toBe(
      'recompiling image for ../fixtures/UpdateSandwichMenu.yaml'
    );
  });

  it("warns when yaml files can't be found", async () => {
    const { p, cb } = mkCb();
    const input = vfile({
      contents: `
![](../fixtures/NonExistent.yaml)
`,
      path: path.join(runtimeDir, 'test.md'),
    });

    remark().use(linkMessageViews).process(input, cb);
    const file = await p;
    expect(file.contents).toBe(input.contents);
    expect(file.messages[0].message).toMatch(
      'something went wrong compiling ../fixtures/NonExistent.yaml: Error: ENOENT: no such file or directory, open'
    );
  });
});
