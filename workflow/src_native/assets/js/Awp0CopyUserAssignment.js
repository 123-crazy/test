//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0CopyUserAssignment
 */
import app from 'app';
import ClipboardService from 'js/clipboardService';
import 'lodash';

/**
 * Define public API
 */
var exports = {};

/**
 *   The copy command delegate for the user assignment objects in the surrogates table
 */
export let execute = function( selectedObjs ) {
    if( selectedObjs ) {
        var userObjs = [];

        selectedObjs.forEach( function( obj ) {
            // Get user surrogate assignment
            var userPropertyObj = obj.props.awp0User.value;

            if( userPropertyObj ) {
                userObjs.push( userPropertyObj );
            }
        } );

        // Copy userObjects to the clipboard
        ClipboardService.instance.setContents( userObjs );
    }
};

/**
 * This factory creates a service and returns exports
 *
 * @member Awp0CopyUserAssignment
 */

export default exports = {
    execute
};
app.factory( 'Awp0CopyUserAssignment', () => exports );
