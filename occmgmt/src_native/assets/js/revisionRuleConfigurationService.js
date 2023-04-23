//@<COPYRIGHT>@
//==================================================
//Copyright 2017.
//Siemens Product Lifecycle Management Software Inc.
//All Rights Reserved.
//==================================================
//@<COPYRIGHT>@

/*global

 */

/**
 * @module js/revisionRuleConfigurationService
 */
import app from 'app';
import eventBus from 'js/eventBus';
import appCtxSvc from 'js/appCtxService';
import uwPropertyService from 'js/uwPropertyService';
import cdm from 'soa/kernel/clientDataModel';
import viewModelObjectService from 'js/viewModelObjectService';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import aceStructureConfigurationService from 'js/aceStructureConfigurationService';

var exports = {};

var globalLabel = null;
var globalRevisionRuleLabel = null;
var _isSeparatorAdded = false;

export let populateRuleDateFeatureInfo = function( data ) {
    if( data && data.dataProviders && data.dataProviders.getRevisionRules && data.contextKeyObject ) {
        data.dataProviders.getRevisionRules.isRuleDateVisible = data.contextKeyObject.supportedFeatures.Awb0RuleDateFeature;
    }
};

var isRevisionRuleSuppressed = function( currentRevisionRuleModelObject ) {
    return currentRevisionRuleModelObject.props.suppressed.dbValues[ 0 ];
};

var extractRevisionRuleDescriptionToShow = function( currentRevisionRuleModelObject ) {
    var revRuleDescProperty = uwPropertyService.createViewModelProperty(
        currentRevisionRuleModelObject.props.object_desc.dbValues[ 0 ],
        currentRevisionRuleModelObject.props.object_desc.uiValues[ 0 ], 'STRING',
        currentRevisionRuleModelObject.props.object_desc.dbValues[ 0 ], '' );
    revRuleDescProperty.uiValue = currentRevisionRuleModelObject.props.object_desc.uiValues[ 0 ];
    return revRuleDescProperty;
};

var populateCurrentRevisionRule = function( data ) {
    if( data ) {
        var currentRevisionRule = data.contextKeyObject.productContextInfo.props.awb0CurrentRevRule;
        if( currentRevisionRule ) {
            data.currentRevisionRule = uwPropertyService.createViewModelProperty( currentRevisionRule.dbValues[ 0 ],
                currentRevisionRule.uiValues[ 0 ], 'STRING', currentRevisionRule.dbValues[ 0 ], currentRevisionRule.uiValues );
            if( data.currentRevisionRule ) {
                var currentRevisionRuleModelObject = cdm.getObject( currentRevisionRule.dbValues );
                if( currentRevisionRuleModelObject ) {
                    var suppressed = isRevisionRuleSuppressed( currentRevisionRuleModelObject );
                    if( suppressed === '0' && data.currentRevisionRuleDescription ) {
                        data.currentRevisionRuleDescription = extractRevisionRuleDescriptionToShow( currentRevisionRuleModelObject );
                    }
                }
            }
        }
    }
};

var populateExplicitGlobalRevRuleIndicatorString = function( data ) {
    if( data ) {
        var userSessionObject = cdm.getUserSession();
        if( userSessionObject ) {
            var globalRevRuleProperty = userSessionObject.props.awp0RevRule;
            if( globalRevRuleProperty && globalRevRuleProperty.uiValues ) {
                var globalRevRuleName = globalRevRuleProperty.uiValues[ 0 ];
                if( globalRevRuleName && globalRevRuleName === data.currentRevisionRule.uiValue ) {
                    appCtxSvc.ctx.aceActiveContext.context.isUsingGlobalRevisionRule = true;
                } else {
                    appCtxSvc.ctx.aceActiveContext.context.isUsingGlobalRevisionRule = false;
                }
            }
        }
    }
};

var prepareGlobalRevisionRuleDisplayProperty = function( data ) {
    if( data ) {
        var globalRevRuleProperty = uwPropertyService.createViewModelProperty( globalRevisionRuleLabel,
            globalRevisionRuleLabel, 'STRING', globalRevisionRuleLabel, '' );
        data.globalRuleValue = globalRevRuleProperty;
        return globalRevRuleProperty;
    }
};

var populateImplicitGlobalRevRuleIndicatorString = function( data ) {
    if( data ) {
        var globalRevRulePropertyOnPCI = data.contextKeyObject.productContextInfo.props.awb0UseGlobalRevisionRule;
        if( globalRevRulePropertyOnPCI && globalRevRulePropertyOnPCI.dbValues[ 0 ] === '1' && data.globalLabel ) {
            globalRevisionRuleLabel = data.globalLabel.uiValue + ' (' + data.currentRevisionRule.uiValue + ')';
            data.currentRevisionRule = prepareGlobalRevisionRuleDisplayProperty( data );
        }
        globalLabel = data.globalLabel && data.globalLabel.uiValue;
    }
};

var populateIndicationForUsingGlobalRevisionRule = function( data ) {
    if( data ) {
        globalRevisionRuleLabel = null;
        if( !data.contextKeyObject.supportedFeatures.Awb0EnableUseGlobalRevisionRuleFeature ) {
            populateExplicitGlobalRevRuleIndicatorString( data );
        } else {
            populateImplicitGlobalRevRuleIndicatorString( data );
        }
    }
};

/**
 * Initialize the Revision Rule Configuration Section
 *
 * @param {Object} data - The 'data' object from viewModel.
 */
export let getInitialRevisionRuleConfigurationData = function( data ) {
    if( data ) {
        aceStructureConfigurationService.populateContextKey( data );
        if( data.contextKeyObject && data.contextKeyObject.productContextInfo ) {
            populateCurrentRevisionRule( data );
            populateIndicationForUsingGlobalRevisionRule( data );
        }
    }
};

/**
 * Initialize the Revision Rule description and effectivity overrider text
 *
 * @param {Object} data - The 'data' object from viewModel.
 */
export let initializeRevRuleDescAndOverridenText = function( data ) {
    if( data ) {
        aceStructureConfigurationService.populateContextKey( data );
        populateCurrentRevisionRule( data );
    }
};

var addGlobalRevisionRuleEntryIfApplicable = function( response, revisionRules, contextKeyObject ) {
    if( contextKeyObject.supportedFeatures.Awb0EnableUseGlobalRevisionRuleFeature ) {
        var viewModelObj = viewModelObjectService.createViewModelObject( response.globalRevisionRule.uid,
            'globalRevRule' );
        if( viewModelObj ) {
            if( viewModelObj.props.object_string && globalLabel ) {
                globalRevisionRuleLabel = globalLabel + ' (' + viewModelObj.props.object_string.dbValues[ 0 ] +
                    ')';
            }
            var globalRevisionRuleEntry = tcViewModelObjectService.createViewModelObjectById( 'globalRevisionRuleEntry' );

            globalRevisionRuleEntry.props.object_string = uwPropertyService.createViewModelProperty(
                globalRevisionRuleLabel,
                globalRevisionRuleLabel, 'STRING',
                globalRevisionRuleLabel, '' );

            globalRevisionRuleEntry.cellHeader1 = globalRevisionRuleLabel;

            if( response.endIndex <= 20 ) {
                revisionRules.splice( 0, 0, globalRevisionRuleEntry );
                response.totalFound += 1;
            }
        }
    }
};

export let processRevisionRules = function( response, contextKeyObject ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var revisionRules = [];
    if( response.endIndex <= 20 ) {
        _isSeparatorAdded = false;
    }
    if( response && response.revisionRules ) {
        var separatorObject = tcViewModelObjectService.createViewModelObjectById( 'separatorObject' );
        separatorObject.marker = response.marker + 1;

        var revisionRulesList = response.revisionRules;
        revisionRulesList.forEach( function( revRuleInfo ) {
            var revisionRule = revRuleInfo.revisionRule;
            revisionRule.serializedRevRule = revRuleInfo.serializedRevRule;
            revisionRules.push( revisionRule );
        } );

        if( !_isSeparatorAdded && response.marker >= 0 && response.marker <= response.endIndex ) {
            revisionRules.splice( response.marker, 0, separatorObject );
            response.totalFound += 1;
            _isSeparatorAdded = true;
        }
    }
    if( response && response.globalRevisionRule && !contextKeyObject.supportedFeatures.Awb0EnableUseDefaultRevisionRuleFeature ) {
        addGlobalRevisionRuleEntryIfApplicable( response, revisionRules, contextKeyObject );
    }
    return revisionRules;
};

export let evaluateStartIndexForRevisionRuleDataProvider = function( dp, contextKeyObject ) {
    if( dp.startIndex === 0 ) {
        return 0;
    }

    var isMarkerPresent = false;

    for( var i = 0; i < dp.viewModelCollection.loadedVMObjects.length; i++ ) {
        if( dp.viewModelCollection.loadedVMObjects[ i ].marker ) {
            isMarkerPresent = true;
            break;
        }
    }
    var extraObjectInList = 0;

    if( contextKeyObject.supportedFeatures.Awb0EnableUseGlobalRevisionRuleFeature ) {
        extraObjectInList += 1;
    }

    if( isMarkerPresent ) {
        extraObjectInList += 1;
    }
    return dp.viewModelCollection.loadedVMObjects.length - extraObjectInList;
};

export let updatePartialCtx = function( path, value ) {
    appCtxSvc.updatePartialCtx( path, value );
};

export let evaluateVariantRuleUID = function( contextKeyObject ) {
    if( contextKeyObject.supportedFeatures && contextKeyObject.supportedFeatures.Awb0NoVariantRuleResetFeature ) {
        return contextKeyObject.productContextInfo.props.awb0VariantRules.dbValues;
    }
    return null;
};

export let updateRevisionRule = function( eventData, data ) {
    if( data.contextKeyObject.productContextInfo.props.awb0CurrentRevRule.dbValues[ 0 ] && eventData.selectedObjects.length > 0 ) {
        if( eventData.selectedObjects[ '0' ].marker >= 0 ) { // Handle Separator selected
            exports.selectRevisionRule( data, data.dataProviders.getRevisionRules );
        } else if( eventData.selectedObjects[ 0 ].uid === 'globalRevisionRuleEntry' && // Handle Global Revision Rule selected
                data.contextKeyObject.productContextInfo.props.awb0UseGlobalRevisionRule &&
                data.contextKeyObject.productContextInfo.props.awb0UseGlobalRevisionRule.dbValues[ 0 ] !== '1' ) {
            eventData.revisionRule = null;
            eventData.useGlobalRevRule = true;
            exports.setRevisionRule( {
                revisionRule: null,
                useGlobalRevRule: true,
                selectedObject: eventData.selectedObjects[ 0 ],
                viewKey: data.viewKey
            } );
        } else if( eventData.selectedObjects[ 0 ].uid !== 'globalRevisionRuleEntry' && // Handle Revision Rule selected
            ( eventData.selectedObjects[ 0 ].uid !== data.contextKeyObject.productContextInfo.props.awb0CurrentRevRule.dbValues[ 0 ] ||
                (data.contextKeyObject.productContextInfo.props.awb0UseGlobalRevisionRule &&
                    data.contextKeyObject.productContextInfo.props.awb0UseGlobalRevisionRule.dbValues[ 0 ] === '1')
                ) ) {
            eventData.revisionRule = eventData.selectedObjects[ 0 ].uid;
            eventData.useGlobalRevRule = null;
            exports.setRevisionRule( {
                revisionRule: eventData.selectedObjects[ 0 ].uid,
                useGlobalRevRule: null,
                selectedObject: eventData.selectedObjects[ 0 ],
                viewKey: data.viewKey
            } );
        }
    } else { // Handle Current Revision rule selected
        eventBus.publish( 'awPopupWidget.close' );
    }
};

export let selectRevisionRule = function( data, dataprovider ) {
    if( dataprovider.viewModelCollection.loadedVMObjects.length > 0 ) {
        if( data.contextKeyObject.productContextInfo.props.awb0UseGlobalRevisionRule && data.contextKeyObject.productContextInfo.props.awb0UseGlobalRevisionRule.dbValues[ 0 ] === '1' ) {
            dataprovider.changeObjectsSelection( 0, 0, true );
        } else {
            var indexOfCurrentRev = dataprovider.viewModelCollection.loadedVMObjects
                .map( function( x ) {
                    return x.uid;
                } ).indexOf( data.contextKeyObject.productContextInfo.props.awb0CurrentRevRule.dbValues[ 0 ] );
            if( indexOfCurrentRev >= 0 ) {
                dataprovider.changeObjectsSelection( indexOfCurrentRev,
                    indexOfCurrentRev, true );
            }
        }
    }
};

export let setRevisionRule = function( eventData ) {
    eventBus.publish( 'awConfigPanel.revisionRuleChanged', eventData );
    eventBus.publish( 'awPopupWidget.close' );
};

export let updateCurrentRevisionRule = function( data, eventData ) {
    if( data && data.currentRevisionRule ) {
        data.currentRevisionRule = eventData.selectedObject.props.object_string;
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'REVISION_RULE_CHANGE' );
    }
};

/**
 * Revision Rule Configuration service utility
 */

export default exports = {
    getInitialRevisionRuleConfigurationData,
    initializeRevRuleDescAndOverridenText,
    processRevisionRules,
    evaluateStartIndexForRevisionRuleDataProvider,
    updatePartialCtx,
    evaluateVariantRuleUID,
    updateRevisionRule,
    selectRevisionRule,
    setRevisionRule,
    updateCurrentRevisionRule,
    populateRuleDateFeatureInfo
};
app.factory( 'revisionRuleConfigurationService', () => exports );
