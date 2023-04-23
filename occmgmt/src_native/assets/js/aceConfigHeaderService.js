// @<COPYRIGHT>@
// ==================================================
// Copyright 2018.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/aceConfigHeaderService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';
import endItemUnitEffectivityConfigurationService from 'js/endItemUnitEffectivityConfigurationService';

var exports = {};

var populateEffectivityEndItem = function( data, pci ) {
    let unitRangeEffGroups = endItemUnitEffectivityConfigurationService.getUnitEffectivityGroupsFromProductContextInfo( data );
    if( unitRangeEffGroups && unitRangeEffGroups.length > 0 ) {
        // For group effectivity end item is hidden as we cannot separate end units
        data.effectivityEndItem.dbValue = '';
        data.effectivityEndItem.uiValue = '';
    } else {
        var effectivityEndItem = pci.props.awb0EffEndItem;
        var effEndItemStr;
        if( !effectivityEndItem || !effectivityEndItem.dbValues[ 0 ] ) {
            var topProduct = pci.props.awb0Product;
            var topProductObj = cdm.getObject( topProduct.dbValues[ 0 ] );
            effEndItemStr = topProductObj.props.items_tag.uiValues[ 0 ];
            populateEffEndItemOnData( data, effEndItemStr );
        } else {
            var effEndItem = cdm.getObject( effectivityEndItem.dbValues[ 0 ] );
            if( !effEndItem.props.object_string ) {
                dmSvc.getProperties( [ effEndItem.uid ], [ 'object_string' ] ).then( function() {
                    effEndItemStr = effEndItem.props.object_string.dbValues[ 0 ];
                    populateEffEndItemOnData( data, effEndItemStr );
                } );
            }else{
                effEndItemStr = effEndItem.props.object_string.dbValues[ 0 ];
                populateEffEndItemOnData( data, effEndItemStr );
            }
        }
    }
};

var populateEffEndItemOnData = function( data, effEndItemStr ) {
    data.effectivityEndItem.dbValue = '(' + effEndItemStr + ')';
    data.effectivityEndItem.uiValue = '(' + effEndItemStr + ')';
};

var populateSVROwningEndItem = function( data, pci ) {
    var svrOwiningItem = pci.props.awb0VariantRuleOwningRev;
    if( !svrOwiningItem || !svrOwiningItem.dbValues[ 0 ] ) {
        svrOwiningItem = pci.props.awb0Product;
    }
    var svrOwningItemRev = cdm.getObject( svrOwiningItem.dbValues[ 0 ] );
    data.SVROwningItemRev.dbValue = '(' + svrOwningItemRev.props.object_string.dbValues[ 0 ] + ')';
    data.SVROwningItemRev.uiValue = '(' + svrOwningItemRev.props.object_string.dbValues[ 0 ] + ')';
};
export let initializeAceConfigHeader = function( data ) {
    aceStructureConfigurationService.populateContextKey( data );
    var pci = data.contextKeyObject.productContextInfo;
    if( pci ) {
        populateEffectivityEndItem( data, pci );
        populateSVROwningEndItem( data, pci );
    }
};

export default exports = {
    initializeAceConfigHeader
};
/**
 * Register this service with AngularJS
 *
 * @memberof NgServices
 * @member aceConfigHeaderService
 */
app.factory( 'aceConfigHeaderService', () => exports );

/**
 * Return this service name as the 'moduleServiceNameToInject' property.
 */
