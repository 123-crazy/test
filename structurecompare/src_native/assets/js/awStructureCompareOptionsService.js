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
 * @module js/awStructureCompareOptionsService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import compareContextService from 'js/awStructureCompareContextService';
import localeSvc from 'js/localeService';
import messagingSvc from 'js/messagingService';
import soaSvc from 'soa/kernel/soaService';
import $ from 'jquery';

var exports = {};

function _getDisplayValueFromInternalValue( propInternalVal ) {
    var resource = 'StructureCompareConstants';
    var localeTextBundle = localeSvc.getLoadedText( resource );
    var propDisplayVal = '';
    if( propInternalVal === 1 ) {
        propDisplayVal = localeTextBundle.SingleLevelCompare;
    } else if( propInternalVal === -4 ) {
        propDisplayVal = localeTextBundle.ComponentLevelCompare;
    } else if( propInternalVal === -1 ) {
        propDisplayVal = localeTextBundle.MultiLevelCompare;
    } else if( propInternalVal === -3 ) {
        propDisplayVal = localeTextBundle.LinkedAssemblyLevelCompare;
    }

    return propDisplayVal;
}

function _getCompareListFromResponse( options ) {
    var compareOptionList = [];
    for( var ix = 0; ix < options.length; ix++ ) {
        var internalVal = parseInt( options[ ix ] );
        var option = {
            propInternalValue: internalVal,
            propDisplayValue: _getDisplayValueFromInternalValue( internalVal )
        };
        compareOptionList.push( option );
    }

    //Sort them alphabetically
    if( compareOptionList.length > 1 ) {
        compareOptionList.sort( function compare( option1, option2 ) {
            if( option1.propDisplayValue < option2.propDisplayValue ) {
                return -1;
            } else if( option1.propDisplayValue > option2.propDisplayValue ) {
                return 1;
            }
            return 0;
        } );
    }

    return compareOptionList;
}

function getColorStyleForProperty( propertyName ) {
    var colorStyle;
    switch ( propertyName ) {
        case 'FULL_MATCH':
            colorStyle = 'aw-compare-colorcheckbox-matched';
            break;
        case 'PARTIAL_MATCH':
            colorStyle = 'aw-compare-colorcheckbox-different';
            break;
        case 'MISSING_TARGET':
            colorStyle = 'aw-compare-colorcheckbox-uniquetarget';
            break;
        case 'MISSING_SOURCE':
            colorStyle = 'aw-compare-colorcheckbox-uniquesource';
            break;
        default:
            console.log( 'Invalid property name passed to getColorStyleForProperty function' );
    }
    return colorStyle;
}

/** Export APIs */
export let setInitialCompareOption = function() {
    var depth = compareContextService.getCtx( 'compareContext.depth' );
    if( depth ) {
        var optionDisplayVal = _getDisplayValueFromInternalValue( depth );
        compareContextService.updatePartialCtx( 'compareContext.initDispValue', optionDisplayVal );
    }
};

export let getCompareOptions = function( data ) {
    setTimeout( function() {
        var displayTypes = [ data.FULL_MATCH, data.PARTIAL_MATCH, data.MISSING_TARGET, data.MISSING_SOURCE ];
        displayTypes.forEach( function( type ) {
            if( type ) {
                exports.updateMatchTypes( type );
            }
        } );
    }, 0 );

    var deferred = AwPromiseService.instance.defer();
    var cmpOptions = compareContextService.getCtx( 'compareContext.compareOptions' );
    if( cmpOptions ) {
        data.compareOptionsList = cmpOptions;
        if( cmpOptions.find( option => option.propInternalValue === -3 ) ) {
            data.isLicensePresent = true;
        }
        exports.setInitialCompareOption();
        return deferred.promise;
    }

    var compareList = compareContextService.getCtx( 'compareList' );
    var src = compareList.cmpSelection1;
    var trg = compareList.cmpSelection2;
    var srcObject = {
        type: src.type,
        uid: src.uid
    };
    var trgObject = {
        type: trg.type,
        uid: trg.uid
    };
    var inputData = {
        sourceObject: srcObject,
        targetObject: trgObject
    };
    soaSvc.postUnchecked( 'Internal-ActiveWorkspaceBom-2018-12-Compare', 'getCompareOptions', inputData ).then(
        function( soaresponse ) {
            if( soaresponse ) {
                var options = soaresponse.compareOptions.filteringRule;
                var compareOptions = _getCompareListFromResponse( options );
                data.compareOptionsList = compareOptions;

                // If Linked Assembly Level (dbValue=-3) is in the list, then license check was positive
                if( compareOptions.find( option => option.propInternalValue === -3 ) ) {
                    data.isLicensePresent = true;
                }
                compareContextService.updatePartialCtx( 'compareContext.compareOptions', compareOptions );
                exports.setInitialCompareOption();
                deferred.resolve();
            }
        },
        function( error ) {
            messagingSvc.showError( error.message );
        }
    );
    return deferred.promise;
};

export let updateEquivalenceTypes = function( property ) {
    var displayOptions = compareContextService.getCtx( 'compareContext.displayOptions' );
    if( property.dbValue ) {
        if( displayOptions && displayOptions.Equivalence ) {
            displayOptions.Equivalence[ property.propertyName ] = true;
        } else {
            displayOptions = {};
            displayOptions.Equivalence = {};
            displayOptions.Equivalence[ property.propertyName ] = true;
            compareContextService.updatePartialCtx( 'compareContext.displayOptions', displayOptions );
        }
    } else {
        if( displayOptions ) {
            var equivalenceTypes = displayOptions.Equivalence;
            if( equivalenceTypes ) {
                delete displayOptions.Equivalence[ property.propertyName ];
            }
        }
    }
};

export let updateMatchTypes = function( property ) {
    var style = getColorStyleForProperty( property.propertyName );
    var displayOptions = compareContextService.getCtx( 'compareContext.displayOptions' );
    if( property.dbValue ) {
        var propertyLabel = $( 'label' ).filter( function() {
            return  $( this ).text() === property.propertyDisplayName;
        } );
        propertyLabel.siblings( '.afx-checkbox' ).children( 'label' ).children( '.afx-checkbox-md-style' ).children( 'span' ).addClass( style );

        if( displayOptions && displayOptions.MatchType ) {
            displayOptions.MatchType[ property.propertyName ] = true;
        } else {
            displayOptions = {};
            displayOptions.MatchType = {};
            displayOptions.MatchType[ property.propertyName ] = true;
            compareContextService.updatePartialCtx( 'compareContext.displayOptions', displayOptions );
        }
    } else {
        var label = $( 'label' ).filter( function() {
            return $( this ).text() === property.propertyDisplayName;
        } );
        label.siblings( '.afx-checkbox' ).children( 'label' ).children( '.afx-checkbox-md-style' ).children( 'span' ).removeClass( style );

        if( displayOptions ) {
            var matchTypes = displayOptions.MatchType;
            if( matchTypes ) {
                delete displayOptions.MatchType[ property.propertyName ];
            }
        }
    }
};

/**
 * @member awStructureCompareOptionsService
 */

export default exports = {
    setInitialCompareOption,
    getCompareOptions,
    updateEquivalenceTypes,
    updateMatchTypes
};
app.factory( 'awStructureCompareOptionsService', () => exports );
