"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const message_view_1 = require("./message-view");
describe('_makeAttributes', () => {
    it('presents strings and numbers as-is', () => {
        const str = message_view_1._makeAttributes({ type: 'string' }, { indent: 4, name: 'a-string' });
        expect(str).toEqual([[4, 'a-string: string']]);
        const num = message_view_1._makeAttributes({ type: 'number' }, { indent: 2, name: 'a-number' });
        expect(num).toEqual([[2, 'a-number: number']]);
    });
    it('enumerates enums', () => {
        const enu = message_view_1._makeAttributes({
            type: 'integer',
            format: 'enum-int32',
            'x-enumName': 'MenuItemDietEnum',
            'x-enumSuffix': 'MenuItemDiet',
            'x-enumNames': ['Vegan', 'Vegetarian', 'Meaty'],
            enum: [0, 1, 2],
        }, { indent: 2, name: 'Diet' });
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
        }, { indent: 0, name: 'Meal' });
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
            }, { indent: 0, name: 'coins' });
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
        }, { indent: 3, name: 'coins' });
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
        }, { indent: 2, name: 'card' });
        expect(arr).toEqual([
            [2, 'card: tuple of'],
            [3, '0: string'],
            [3, '1: number'],
            [3, '2: string'],
        ]);
    });
});
