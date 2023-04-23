//@<COPYRIGHT>@
//==================================================
//Copyright 2018.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@
/*global
 define
 */

/**
 * @module js/revisionRuleAdminLocationService
 */
import app from 'app';
import localeSvc from 'js/localeService';

var _localeTextBundle = null;

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * Update part of a context
 *
 * @param {DeclViewModel} data - AddClausesViewModel object
 *
 */
export let addRevisionRule = function( data ) {
    // TODO: to be implemented
};

_localeTextBundle = localeSvc.getLoadedText( app.getBaseUrlPath() + '/i18n/RevisionRuleAdminConstants' );

export default exports = {
    addRevisionRule
};
/**
 * @memberof NgServices
 * @member acerevisionRuleAdminPanelService
 */
app.factory( 'revisionRuleAdminLocationService', () => exports );
