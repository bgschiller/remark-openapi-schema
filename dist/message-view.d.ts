export declare function _makeAttributes(schema: any, { indent, name }: {
    name: string;
    indent: number;
}): [number, string][];
export declare function createSvg(message_: any): Promise<string>;
export declare function schemaToSvg(messageFile: string, destination: string): {
    filename: string;
    completion: Promise<void>;
};
