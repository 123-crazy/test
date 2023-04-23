// Copyright (c) 2020 Siemens

/**
 * @module js/awConstantsService
 *
 * @namespace awConstantsService
 */
import app from 'app';
import browserUtils from 'js/browserUtils';

var exports = {};

var Constants = {
    fmsUrl: browserUtils.getBaseURL() + 'fms/fmsupload/'
};

/**
 * Get the value of Constant parameter
 *
 * @param {String} constantName - Parameter name
 * @return {String} Value of the constant parameter
 */
export let getConstant = function( constantName ) {
    var newVal = constantName.replace( 'Constants.', '' );
    return Constants[ newVal ];
};

exports = {
    getConstant
};
export default exports;
/**
 * Definition for the 'awConstantsService' service used by declarative panels in application.
 *
 * @member awConstantsService
 * @memberof NgServices
 *
 * @returns {awConstantsService} Instance of the service API object.
 */
app.factory( 'awConstantsService', () => exports );
