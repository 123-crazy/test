// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This represents the Base class for Service
 *
 * @module js/awBaseService
 */

export default class AwBaseService {
    /**
     * Singleton practice
     */
    static get instance() {
        if( !this.__instance ) {
            this.__initializing = true;
            try {
                this.__instance = new this();
                delete this.__initializing;
            } catch ( e ) {
                delete this.__initializing;
                throw e;
            }
        }
        return this.__instance;
    }

    static reset() {
        delete this.__instance;
    }

    constructor() {
        // To stop people doing new practice
        if ( !this.constructor.__initializing ) {
            throw Error( `Please call '${this.constructor.name}.instance' instead of 'new ${this.constructor.name}()'` );
        }
    }
}
