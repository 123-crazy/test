// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This module provides core angularJS services abstraction.
 *
 * @module js/awUrlMatcherFactoryService
 */
import { valFromString } from 'js/serviceUtils';

const decode = ( type ) => {
    return ( param ) => {
        switch ( type ) {
            case 'string': {
                return valFromString( param );
            }
            case undefined: {
                throw new Error( 'set type first using typeOf method' );
            }
        }
    };
};
const type = ( type ) => {
    return { decode: decode( type ) };
};
export const instance = { type };

export default { instance };
