export declare function _makeAttributes(schema: any, { indent, name, enumNameToOptions }: {
    name: string;
    indent: number;
    enumNameToOptions: {
        [k: string]: string[];
    };
}): [number, string][];
export declare function enumNames(message: any): any;
export declare function createSvg(message_: any): Promise<string>;
export declare function schemaToSvg(messageFile: string, destination: string): {
    filename: string;
    completion: Promise<void>;
};
