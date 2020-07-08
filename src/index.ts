import visit from 'unist-util-visit';
import path from 'path';
import { VFile } from 'vfile';
import fs from 'fs-extra';
import { Node } from 'unist';
import { Image, Link } from 'mdast';
import { schemaToSvg } from './message-view';

function isYamlLink(n: Node): n is Link {
  return n.type === 'link' && /\.yaml$/.test((n as Link).url);
}

function isYamlImage(n: Image): boolean {
  return /\.yaml$/.test(n.url);
}

export function linkMessageViews() {
  return transformer;

  async function transformer(tree: Node, vfile: VFile): Promise<void> {
    const mdDir = (vfile.data as any).destinationDir || vfile.dirname;
    const imageDir = path.join(mdDir, 'images');
    await fs.mkdirp(imageDir);

    function mkReplacement({ yaml, svg }: { yaml: string; svg: string }): Link {
      const embeddedImg: Image = {
        type: 'image',
        url: path.relative(mdDir, svg),
      };
      const replacement: Link = {
        type: 'link',
        url: yaml,
        children: [embeddedImg],
      };
      return replacement;

    }

    const proms: Promise<any>[] = [];

    visit<Image>(tree, 'image', (node, index, parent) => {
      if (isYamlLink(parent)) {
        const { completion } = schemaToSvg(path.join(mdDir, (parent as Link).url), imageDir);
        proms.push(completion
          .then(() => vfile.info(`recompiling image for ${parent.url}`, node))
          .catch((err) => vfile.message(`something went wrong recompiling ${parent.url}: ${err}`, node)));

      } else if (isYamlImage(node)) {
        const { completion, filename } = schemaToSvg(path.join(mdDir, node.url), imageDir);
        proms.push(completion
          .then(() => vfile.info(`new yaml link found: ${node.url}`, node))
          .catch((err) => vfile.message(`something went wrong compiling ${node.url}: ${err}`)));

        (parent.children as Node[]).splice(index, 1, mkReplacement({ yaml: node.url, svg: filename }));
      }
    });

    return Promise.all(proms).then(() => {});
  }
}
