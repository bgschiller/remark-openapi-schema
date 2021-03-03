"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const message_view_1 = require("./message-view");
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
const fs_1 = require("fs");
describe('_makeAttributes', () => {
    it('presents strings and numbers as-is', () => {
        const str = message_view_1._makeAttributes({ type: 'string' }, { indent: 4, name: 'a-string', enumNameToOptions: {} });
        expect(str).toEqual([[4, 'a-string: string']]);
        const num = message_view_1._makeAttributes({ type: 'number' }, { indent: 2, name: 'a-number', enumNameToOptions: {} });
        expect(num).toEqual([[2, 'a-number: number']]);
    });
    it('enumerates enums', () => {
        const enu = message_view_1._makeAttributes({
            type: 'integer',
            format: 'enum-int32',
            'x-enumName': 'MenuItemDietEnum',
            'x-enumSuffix': 'MenuItemDiet',
            enum: [0, 1, 2],
        }, { indent: 2, name: 'Diet', enumNameToOptions: { 'MenuItemDietEnum': ['Vegan', 'Vegetarian', 'Meaty'] } });
        expect(enu).toEqual([
            [2, 'Diet: enum of'],
            [3, 'Vegan'], [3, 'Vegetarian'], [3, 'Meaty'],
        ]);
    });
    it('lists object properties', () => {
        const obj = message_view_1._makeAttributes({
            type: 'object',
            properties: {
                id: { type: 'string' },
                name: { type: 'string' },
            },
        }, { indent: 0, name: 'Meal', enumNameToOptions: {} });
        expect(obj).toEqual([
            [0, 'Meal: object of'],
            [1, 'id: string'],
            [1, 'name: string'],
        ]);
    });
    it('handles arrays of primitives', () => {
        ['string', 'number'].forEach(prim => {
            const arr = message_view_1._makeAttributes({
                type: 'array',
                items: { type: prim },
            }, { indent: 0, name: 'coins', enumNameToOptions: {} });
            expect(arr).toEqual([
                [0, `coins: array of ${prim}`]
            ]);
        });
    });
    it('handles arrays of objects', () => {
        const arr = message_view_1._makeAttributes({
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    a: { type: 'string' },
                    b: { type: 'number' }
                }
            },
        }, { indent: 3, name: 'coins', enumNameToOptions: {} });
        expect(arr).toEqual([
            [3, 'coins: array of objects with'],
            [4, 'a: string'],
            [4, 'b: number'],
        ]);
    });
    it('handles tuples', () => {
        const arr = message_view_1._makeAttributes({
            type: 'array',
            items: [
                { type: 'string' },
                { type: 'number' },
                { type: 'string' }
            ]
        }, { indent: 2, name: 'card', enumNameToOptions: {} });
        expect(arr).toEqual([
            [2, 'card: tuple of'],
            [3, '0: string'],
            [3, '1: number'],
            [3, '2: string'],
        ]);
    });
});
describe('enumNames', () => {
    it('finds the right values', async () => {
        const messageFile = path_1.default.join(__dirname, 'fixtures/RegisterMessageCapabilitiesResponse.yaml');
        const message = await fs_1.promises.readFile(messageFile, 'utf-8')
            .then(js_yaml_1.default.safeLoad);
        const names = message_view_1.enumNames(message);
        debugger;
        expect(names['RegistrationStatusEnum']).toEqual(['Ok', 'Failed']);
    });
});
