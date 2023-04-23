// Copyright (c) 2020 Siemens
/* eslint-env es6 */

/**
 * This module provides core angularJS services abstraction.
 *
 * @module js/awDocumentService
 * @deprecated afx@4.0.0, Moving away from angular, please use native document API instead.
 * @alternative document
 * @obsoleteIn afx@5.0.0
 */
import $ from 'jquery';

export default class AwDocumentService {
    constructor() {
        // To stop people doing new practice
        throw Error( `Please call '${this.constructor.name}.instance' instead of 'new ${this.constructor.name}()'` );
    }

    static get instance() {
        return $( window.document );
    }
}
