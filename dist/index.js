"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const unist_util_visit_1 = __importDefault(require("unist-util-visit"));
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const message_view_1 = require("./message-view");
function isYamlLink(n) {
    return n.type === 'link' && /\.yaml$/.test(n.url);
}
function isYamlImage(n) {
    return /\.yaml$/.test(n.url);
}
// remark seems to only pick up on plugins if they show up
// as a function when require()'d. This means we can't use
// an "export default", which would make the result of a
// require() be { __esModule: true, default: function() {...} }
module.exports = function linkMessageViews() {
    return transformer;
    async function transformer(tree, vfile) {
        const mdDir = vfile.data.destinationDir || vfile.dirname;
        const imageDir = path_1.default.join(mdDir, 'images');
        await fs_extra_1.default.mkdirp(imageDir);
        function mkReplacement({ yaml, svg }) {
            const embeddedImg = {
                type: 'image',
                url: path_1.default.relative(mdDir, svg),
            };
            const replacement = {
                type: 'link',
                url: yaml,
                children: [embeddedImg],
            };
            return replacement;
        }
        const proms = [];
        unist_util_visit_1.default(tree, 'image', (node, index, parent) => {
            if (isYamlLink(parent)) {
                const { completion } = message_view_1.schemaToSvg(path_1.default.join(mdDir, parent.url), imageDir);
                proms.push(completion
                    .then(() => vfile.info(`recompiling image for ${parent.url}`, node))
                    .catch((err) => vfile.message(`something went wrong recompiling ${parent.url}: ${err}`, node)));
            }
            else if (isYamlImage(node)) {
                const { completion, filename } = message_view_1.schemaToSvg(path_1.default.join(mdDir, node.url), imageDir);
                proms.push(completion
                    .then(() => vfile.info(`new yaml link found: ${node.url}`, node))
                    .catch((err) => vfile.message(`something went wrong compiling ${node.url}: ${err}`)));
                parent.children.splice(index, 1, mkReplacement({ yaml: node.url, svg: filename }));
            }
        });
        return Promise.all(proms).then(() => { });
    }
};
