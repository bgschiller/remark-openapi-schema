'use strict'

import visit from 'unist-util-visit';
import getDefinitions, { Options } from 'mdast-util-definitions';
import { Node } from 'unist';
import { Parent, Definition, Image, Link, ImageReference, LinkReference } from 'mdast';


export function inlineLinks(options: Options) {
  return transformer

  function transformer(tree: Node) {
    const definitions = getDefinitions(tree, options)

    visit(tree, (node, index, parent) => {
      let definition: Definition | null = null;;
      let replacement: Image | Link;
      let image: boolean = false;

      if (node.type === 'definition') {
        (parent as Parent).children.splice(index, 1)
        return [visit.SKIP, index]
      }

      if (node.type === 'imageReference' || node.type === 'linkReference') {
        definition = definitions((node as  ImageReference | LinkReference).identifier)

        if (definition) {
          image = node.type === 'imageReference'

          replacement = {
            type: image ? 'image' : 'link',
            url: definition.url,
            title: definition.title,
            children: [],
          }

          if (image) {
            replacement.alt = node.alt
          } else {
            replacement.children = node.children
          }

          (parent as Parent).children[index] = replacement
          return [visit.SKIP, index]
        }
      }
    });
  }
}
