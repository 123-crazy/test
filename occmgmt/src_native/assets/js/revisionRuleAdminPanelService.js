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
 * @module js/revisionRuleAdminPanelService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import AwFilterService from 'js/awFilterService';
import localeSvc from 'js/localeService';
import revisionRuleAdminCtx from 'js/revisionRuleAdminContextService';
import commandPanelService from 'js/commandPanel.service';
import tcViewModelObjectService from 'js/tcViewModelObjectService';
import clientDataModelSvc from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import _ from 'lodash';
import $ from 'jquery';
import messagingSvc from 'js/messagingService';

var _localeTextBundle = null;

const months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];

var jitterFreePropLoad =  'aceActiveContext.context.transientRequestPref.jitterFreePropLoad';

function _convertDate( dateInEpochFormat ) {
    return AwFilterService.instance( 'date' )( dateInEpochFormat, 'yyyy-MM-dd' ) + 'T' +
        AwFilterService.instance( 'date' )( dateInEpochFormat, 'HH:mm:ssZ' );
}

function getSRUidFromRevRuleUid( revRuleUid ) {
    var srUID;
    if ( clientDataModelSvc.isValidObjectUid( revRuleUid ) ) {
        var obj = clientDataModelSvc.getObject( revRuleUid );
        if ( obj ) {
            srUID = obj.serializedRevRule;
        }
    }
    return srUID;
}

function omitUnwantedProperties( clauses, propertiesToOmit ) {
    var outClauses = [];
    if ( clauses ) {
        clauses.forEach( function( clause ) {
            var outClause = _.omit( clause, propertiesToOmit );
            outClauses.push( outClause );
        } );
    }
    return outClauses;
}

function processRevisionRuleInfo( entriesInfo ) {
    entriesInfo.forEach( function( entry ) {
        if ( entry.entryType === 3 ) {
            var utcDateString = entry.revRuleEntryKeyToValue.date;
            if ( utcDateString ) {
                // Date - Convert UTC to client locale
                var date = new Date( utcDateString );
                var day = ( '0' + date.getDate() ).slice( -2 );
                var hour = ( '0' + date.getHours() ).slice( -2 );
                var minutes = ( '0' + date.getMinutes() ).slice( -2 );
                var clientLocaleDate = day + '-' + months[date.getMonth()] + '-' + date.getFullYear() + ' ' + hour + ':' + minutes;
                entry.revRuleEntryKeyToValue.date = clientLocaleDate;

                if ( entry.revRuleEntryKeyToValue.today !== 'true' ) {
                    var entryText = 'Date( ' + entry.revRuleEntryKeyToValue.date + ')';
                    entry.displayText = entryText;
                }
            }
        }
        var groupText = entry.displayText;
        var groupEntryInfo = entry.groupEntryInfo;
        if ( groupEntryInfo ) {
            var subEntries = groupEntryInfo.listOfSubEntries;
            if ( subEntries ) {
                var subEntriesLength = subEntries.length;
                for ( var ix = 0; ix < subEntriesLength; ix++ ) {
                    groupText = groupText + '\n' + subEntries[ix].displayText;
                    //Add ending brace to Last subentry
                    if ( ix === subEntriesLength - 1 ) {
                        groupText += ' }';
                    }
                }
            }
        }
        entry.displayText = groupText;
    } );
}

/**
 * Check if any of the revision rule, unit effectivity, date effectivity or end item is changed from header and we need to refresh the Revsion rule panel accordingly
 *  @return {Boolean} revRulePanleToBeRefreshed
 *
 */
function isRevisionRulePanelToBeRefreshed() {
    var ctx = revisionRuleAdminCtx.getCtx();
    var revRulePanleToBeRefreshed = false;
    //check if productContextChangedEvent is published because of the change in revision rule, unit effectivity, date effectivity or end item
    if ( _.get( ctx, 'aceActiveContext.context.getOccInput.inputData.config.productContext.uid' ) ) {
        var productContextInGetOccInputUid = ctx.aceActiveContext.context.getOccInput.inputData.config.productContext.uid;
        var productContextInGetOccInput = clientDataModelSvc.getObject( productContextInGetOccInputUid );
        var currentProductContext = ctx.aceActiveContext.context.productContextInfo;

        var revRuleInGetOccInput = '';
        var currentRevRule = '';
        if ( _.get( productContextInGetOccInput, 'props.awb0CurrentRevRule.dbValues' ) && _.get( productContextInGetOccInput, 'props.awb0CurrentRevRule.dbValues' ).length === 1 ) {
            revRuleInGetOccInput = _.get( productContextInGetOccInput, 'props.awb0CurrentRevRule.dbValues' )[0];
        }
        if ( _.get( currentProductContext, 'props.awb0CurrentRevRule.dbValues' ) && _.get( currentProductContext, 'props.awb0CurrentRevRule.dbValues' ).length === 1 ) {
            currentRevRule = _.get( currentProductContext, 'props.awb0CurrentRevRule.dbValues' )[0];
        }

        var effecDateInGetOccInput = '';
        var currentEffecDate = '';
        if ( _.get( productContextInGetOccInput, 'props.awb0EffDate.dbValues' ) && _.get( productContextInGetOccInput, 'props.awb0EffDate.dbValues' ).length === 1 ) {
            effecDateInGetOccInput = _.get( productContextInGetOccInput, 'props.awb0EffDate.dbValues' )[0];
        }
        if ( _.get( currentProductContext, 'props.awb0EffDate.dbValues' ) && _.get( currentProductContext, 'props.awb0EffDate.dbValues' ).length === 1 ) {
            currentEffecDate = _.get( currentProductContext, 'props.awb0EffDate.dbValues' )[0];
        }

        var unitInGetOccInput = '';
        var currentUnit = '';
        if ( _.get( productContextInGetOccInput, 'props.awb0EffUnitNo.dbValues' ) && _.get( productContextInGetOccInput, 'props.awb0EffUnitNo.dbValues' ).length === 1 ) {
            unitInGetOccInput = _.get( productContextInGetOccInput, 'props.awb0EffUnitNo.dbValues' )[0];
        }
        if ( _.get( currentProductContext, 'props.awb0EffUnitNo.dbValues' ) && _.get( currentProductContext, 'props.awb0EffUnitNo.dbValues' ).length === 1 ) {
            currentUnit = _.get( currentProductContext, 'props.awb0EffUnitNo.dbValues' )[0];
        }

        var endItemInGetOccInput = '';
        var currentEndItem = '';
        if ( _.get( productContextInGetOccInput, 'props.awb0EffEndItem.dbValues' ) && _.get( productContextInGetOccInput, 'props.awb0EffEndItem.dbValues' ).length === 1 ) {
            endItemInGetOccInput = _.get( productContextInGetOccInput, 'props.awb0EffEndItem.dbValues' )[0];
        }
        if ( _.get( currentProductContext, 'props.awb0EffEndItem.dbValues' ) && _.get( currentProductContext, 'props.awb0EffEndItem.dbValues' ).length === 1 ) {
            currentEndItem = _.get( currentProductContext, 'props.awb0EffEndItem.dbValues' )[0];
        }

        //compare revision rule , date effectivity, unit effectivity and end item from old ProductContextInfo (get from GetOccInput) and new ProductContextInfo (after getOcc call)
        if ( revRuleInGetOccInput !== currentRevRule || effecDateInGetOccInput !== currentEffecDate || unitInGetOccInput !== currentUnit || endItemInGetOccInput !== currentEndItem ) {
            revRulePanleToBeRefreshed = true;
        }
    }
    return revRulePanleToBeRefreshed;
}

/**
 * ***********************************************************<BR>
 * Define external API<BR>
 * ***********************************************************<BR>
 */
var exports = {};

/**
 * cancel modification done in rev rule and reset the panel to original
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 */

export let cancelModification = function( data ) {
    //reset data provider and data.clauses to original using deepclone
    var ctx = revisionRuleAdminCtx.getCtx();

    //update clauses on panel with original clauses
    var orgClauses = _.cloneDeep( ctx.RevisionRuleAdmin.originalClauses );
    if ( data && data.clauses ) {
        data.clauses = orgClauses;
    }

    //update dataProvider
    if ( _.get( data, 'dataProviders.getRevisionRuleInfoProvider' ) ) {
        data.dataProviders.getRevisionRuleInfoProvider.update( orgClauses, orgClauses.length );
    }

    //set selection back to 1st in list
    data.dataProviders.getRevisionRuleInfoProvider.selectionModel.setSelection( orgClauses[0] );

    //reset revRuleName to previous value

    if ( data.revRuleName ) {
        data.revRuleName.uiValue = ctx.RevisionRuleAdmin.currentlySelectedRevisionRule.props.object_string.dbValues[0];
    }

    //set same clause warning text visibility false
    if ( data.exactlySameClauseWarning ) {
        data.exactlySameClauseWarning.dbValue = false;
    }
};

/**
 * Update selected clause in list on panel -section close event
 *
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 */

export let updateRevisionRuleClauseSelection = function( data ) {
    var clauses = data.clauses;
    if ( data.eventData && data.dataProviders && data.dataProviders.getRevisionRuleInfoProvider ) {
        var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
        var clauseText = data.eventData.caption;
        if ( clauseText ) {
            for ( var inx = 0; inx < clauses.length; inx++ ) {
                var clauseFound = _.isEqual( clauses[inx].displayText, clauseText );
                if ( clauseFound ) {
                    if ( dataProvider.selectionModel ) {
                        dataProvider.selectionModel.setSelection( clauses[inx] );
                    }
                    break;
                }
            }
        }
    }
};

/**
 * Get Revision rule
 *
 * @return {IModelObject} Revision rule model object
 */
export let getRevisionRule = function() {
    var revRuleUid = null;
    var ctx = revisionRuleAdminCtx.getCtx();
    if ( ctx.sublocation.nameToken === 'com.siemens.splm.client.revruleadmin.revRuleAdmin' ) {
        revRuleUid = ctx.mselected[0].uid;
    } else if ( ctx.RevisionRuleAdmin ) {
        var currentRevRule = ctx.RevisionRuleAdmin.currentlySelectedRevisionRule;
        revRuleUid = currentRevRule.uid;
        var srUid;
        if ( currentRevRule && currentRevRule.serializedRevRule && currentRevRule.serializedRevRule.length > 0 ) {
            // This is when transient rev rule is updated from rev rule admin panel
            srUid = currentRevRule.serializedRevRule;
        } else {
            // This is when transient rev rule is selected from config header popup
            srUid = getSRUidFromRevRuleUid( revRuleUid );
        }

        if ( srUid ) {
            revRuleUid = srUid;
        }
    }
    return revRuleUid;
};

/**
 * Add modify tag to revision rule
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 */
export let tagRevisionRuleAsModified = function( data ) {
    var localTextBundle = localeSvc.getLoadedText( app.getBaseUrlPath() + '/i18n/OccurrenceManagementConstants' );
    var modified =  localTextBundle.modified;
    if ( data.revRuleName.uiValue.toUpperCase().search( modified.toUpperCase() ) === -1 ) {
        var modifiedrevRuleName = data.revRuleName.uiValue + ' (' + modified + ')';
        data.revRuleName.uiValue = modifiedrevRuleName;
    }

    var orgClauses = revisionRuleAdminCtx.getRevRuleAdminCtx( 'originalClauses' );
    var currentClauses = omitUnwantedProperties( data.clauses, [ '$$hashKey', 'selected' ] );
    var noChangesToClauses = _.isEqual( orgClauses, currentClauses );
    data.isClauseModified.dbValue = !noChangesToClauses;
};

/**
 * Show the revision rule clauses in panel
 *
 * @param {Object} response - getRevisionRule SOA Response
 * @param {DeclViewModel} data - RevisionRuleAdminPanelViewModel
 *
 * @return {Object} entriesInfo - Revision rule clauses details
 */
export let processClauses = function( response, data ) {
    if ( response.entriesInfo ) {
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'isBranchClausePresent', false );
        var ctx = revisionRuleAdminCtx.getCtx();

        //set same clause warning text visibility false
        if ( data.exactlySameClauseWarning ) {
            data.exactlySameClauseWarning.dbValue = false;
        }

        var revRuleName = ctx.RevisionRuleAdmin.currentlySelectedRevisionRule.props.object_string.dbValue;
        var revRuleDesc = ctx.RevisionRuleAdmin.currentlySelectedRevisionRule.props.object_desc.dbValue;

        data.revRuleName.uiValue = revRuleName;
        data.revRuleDesc.uiValue = revRuleDesc;

        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'isNestedEffectivityPresent', response.nestedEffectivity );

        for ( var inx = 0; inx < response.entriesInfo.length; ++inx ) {
            if ( response.entriesInfo[inx].entryType === 10 ) {
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'isBranchClausePresent', true );
                break;
            }
        }

        processRevisionRuleInfo( response.entriesInfo );

        if ( _.get( data, 'dataProviders.getRevisionRuleInfoProvider' ) ) {
            data.dataProviders.getRevisionRuleInfoProvider.update( response.entriesInfo, response.entriesInfo.length );
        }

        var originalClauses = _.cloneDeep( response.entriesInfo );
        revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'originalClauses', originalClauses );
        return response.entriesInfo;
    }

    return null;
};

export let getUpdatedRevisionRule = function( response, data ) {
    if ( response && response.revisionRuleInfo && response.ServiceData && !response.ServiceData.partialErrors ) {
        if ( response.revisionRuleInfo.entriesInfo ) {
            processRevisionRuleInfo( response.revisionRuleInfo.entriesInfo );
        }
        var revisionRuleInfo = response.revisionRuleInfo;
        var updatedRevRuleUid = revisionRuleInfo.uid;
        var ctx = revisionRuleAdminCtx.getCtx();
        var subPanelContext = _.get( data, '_internal.origCtxNode.$parent.subPanelContext' );
        if ( subPanelContext ) {
            //Update the clauses section
            var dataProvider = _.get( subPanelContext, 'dataProviders.getRevisionRuleInfoProvider' );
            if ( dataProvider ) {
                dataProvider.update( revisionRuleInfo.entriesInfo, revisionRuleInfo.entriesInfo.length );
                subPanelContext.clauses = revisionRuleInfo.entriesInfo;
                eventBus.publish( 'RevisionRulesLoaded' );
            }
            var originalClauses = _.cloneDeep( subPanelContext.clauses );
            revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'originalClauses', originalClauses );
        }

        if ( response.ServiceData && response.ServiceData.created && response.ServiceData.created.length > 0 ) {
            var transientRevRuleUid = response.ServiceData.created[0];
            var transientRevRule = response.ServiceData.modelObjects[transientRevRuleUid];
            if ( transientRevRule ) {
                transientRevRule.serializedRevRule = updatedRevRuleUid;
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'currentlySelectedRevisionRule', transientRevRule );
            }
        }
        var revRuleUID = '';
        if ( response.ServiceData.created && response.ServiceData.created.length > 0 ) {
            revRuleUID = response.ServiceData.created[0];
        }

        if ( revRuleUID !== ctx.aceActiveContext.context.productContextInfo.props.awb0CurrentRevRule.dbValues[0] ) {
            //Fire configuration change event
            appCtxSvc.updatePartialCtx( jitterFreePropLoad, true );
            appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'REVISION_RULE_CHANGE' );
            var contextViewKey = revisionRuleAdminCtx.getRevRuleAdminCtx( 'contextViewKey' );
            var eventData = {
                revisionRule: revRuleUID,
                rev_sruid: updatedRevRuleUid,
                useGlobalRevRule: null,
                contextViewKey: contextViewKey
            };

            eventBus.publish( 'RevisionRuleAdminPanel.revisionRuleChanged', eventData );
        }
    }
};

export let saveRevRuleIfRequiredAndConfigureProduct = function( data ) {
    //Compare current clauses with the original
    var orgClauses = revisionRuleAdminCtx.getRevRuleAdminCtx( 'originalClauses' );
    var currentClauses = omitUnwantedProperties( data.clauses, [ '$$hashKey', 'selected' ] );
    var noChangesToClauses = _.isEqual( orgClauses, currentClauses );
    var currentRevRule = revisionRuleAdminCtx.getRevRuleAdminCtx( 'currentlySelectedRevisionRule' );
    var revRuleUid = currentRevRule.uid;
    var ctx = revisionRuleAdminCtx.getCtx();
    var awb0CurrentRevRuleUid = '';
    if ( _.get( ctx, 'aceActiveContext.context.productContextInfo.props.awb0CurrentRevRule.dbValues' ) ) {
        awb0CurrentRevRuleUid = ctx.aceActiveContext.context.productContextInfo.props.awb0CurrentRevRule.dbValues[0];
    }
    if ( noChangesToClauses && awb0CurrentRevRuleUid !== revRuleUid ) {
        var srUID = getSRUidFromRevRuleUid( revRuleUid );

        //Only Configure the product
        var contextViewKey = revisionRuleAdminCtx.getRevRuleAdminCtx( 'contextViewKey' );
        var eventData = {
            revisionRule: revRuleUid,
            rev_sruid: srUID,
            useGlobalRevRule: null,
            contextViewKey: contextViewKey
        };
        appCtxSvc.updatePartialCtx( jitterFreePropLoad, true );
        appCtxSvc.updatePartialCtx( 'aceActiveContext.context.transientRequestPref.userGesture', 'REVISION_RULE_CHANGE' );
        eventBus.publish( 'RevisionRuleAdminPanel.revisionRuleChanged', eventData );
    } else if ( !noChangesToClauses ) {
        //Save the changes and configure the product
        eventBus.publish( 'RevisionRuleAdminPanel.saveRevRuleAndConfigureProduct' );
    }
};

export let getModifiedRevisionRuleName = function( data ) {
    exports.tagRevisionRuleAsModified( data );
    return data.revRuleName.uiValue;
};

/**
 * Display Revision rule panel with clauses
 *
 * @param {ViewModelObject} currentlySelectedRevisionRule - currently selected revision rule
 *
 */
export let activateRevisionRuleAdminPanel = function( currentlySelectedRevisionRule, commandScope ) {
    var Awb0RevisionRuleDataCtxNode = commandScope;
    while ( Awb0RevisionRuleDataCtxNode.name !== 'Awb0RevisionRule' ) {
        if ( Awb0RevisionRuleDataCtxNode.$parent ) {
            Awb0RevisionRuleDataCtxNode = Awb0RevisionRuleDataCtxNode.$parent;
        } else {
            break;
        }
    }

    var ctx = revisionRuleAdminCtx.getCtx();
    var contextViewKey = 'aceActiveContext.context';
    if ( ctx.splitView && ctx.splitView.mode ) {
        contextViewKey = ctx.aceActiveContext.key;
    }
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'contextViewKey', contextViewKey );

    if ( currentlySelectedRevisionRule.uid === 'globalRevisionRuleEntry' ) {
        var uid = null;
        if ( ctx.userSession.props.awp0RevRule.dbValue.propInternalValue ) {
            uid = ctx.userSession.props.awp0RevRule.dbValue.propInternalValue;
        } else {
            uid = ctx.userSession.props.awp0RevRule.dbValue;
        }
        currentlySelectedRevisionRule = tcViewModelObjectService.createViewModelObjectById( uid );
    }
    revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'currentlySelectedRevisionRule', currentlySelectedRevisionRule );
    eventBus.publish( 'awPopupWidget.close' );

    if ( ctx.sidenavCommandId !== 'RevisionRuleAdminMainPanel' && !_.get( Awb0RevisionRuleDataCtxNode.data, 'subPanelContext.configurationInPanel' ) ) {
        commandPanelService.activateCommandPanel( 'RevisionRuleAdminMainPanel', 'aw_navigation' );
    } else if ( _.get( Awb0RevisionRuleDataCtxNode.data, 'subPanelContext.configurationInPanel' ) ) {
        var context = {
            destPanelId: 'RevisionRuleAdminPanel',
            title: _localeTextBundle.RevisionRuleAdmin,
            recreatePanel: true,
            supportGoBack: true
        };
        eventBus.publish( 'awPanel.navigate', context );
    } else if ( ctx.RevisionRuleAdmin.isAddClausesPanelLoaded || ctx.RevisionRuleAdmin.isAddClausePropertyPanelLoaded && ctx.panelContext.destPanelId === 'AddClausePropertyPanel' ) {
        var eventData = {
            destPanelId: 'RevisionRuleAdminPanel',
            title: 'Back',
            supportGoBack: true
        };
        eventBus.publish( 'awPanel.navigate', eventData );
        eventBus.publish( 'RevisionRuleAdminPanel.UpdateDataProvider' );
    } else if ( ctx.sidenavCommandId === 'RevisionRuleAdminMainPanel' ) {
        eventBus.publish( 'RevisionRuleAdminPanel.UpdateDataProvider' );
    }
};

/**
 * Move the clauses up in the list
 *
 * @param {Object} revRuleName - Revision rule name
 * @param {Object} dataProvider - data provider for displaying the clauses
 *
 */
export let moveClauseUp = function( data ) {
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    var selectedIndex = dataProvider.getSelectedIndexes();
    var clauses = dataProvider.viewModelCollection.getLoadedViewModelObjects();
    var clauseToBeMoved = clauses[selectedIndex[0] - 1];
    clauses[selectedIndex[0] - 1] = dataProvider.selectedObjects[0];
    clauses[selectedIndex[0]] = clauseToBeMoved;

    eventBus.publish( 'RevisionRuleAdminPanel.tagRevisionRuleAsModified', null );
    data.clauses = clauses;
    dataProvider.update( clauses, clauses.length );
};

/**
 * Move the clauses down in the list
 *
 * @param {Object} revRuleName - Revision rule name
 * @param {Object} dataProvider - data provider for displaying the clauses
 *
 */
export let moveClauseDown = function( data ) {
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    var selectedIndex = dataProvider.getSelectedIndexes();
    var clauses = dataProvider.viewModelCollection.getLoadedViewModelObjects();
    var clauseToBeMoved = clauses[selectedIndex[0] + 1];
    clauses[selectedIndex[0] + 1] = dataProvider.selectedObjects[0];
    clauses[selectedIndex[0]] = clauseToBeMoved;

    eventBus.publish( 'RevisionRuleAdminPanel.tagRevisionRuleAsModified', null );
    data.clauses = clauses;
    dataProvider.update( clauses, clauses.length );
};

/**
 * Delete the selected clause
 *
 * @param {Object} revRuleName - Revision rule name
 * @param {Object} dataProvider - data provider for displaying the clauses
 *
 */
export let deleteClause = function( data ) {
    var dataProvider = data.dataProviders.getRevisionRuleInfoProvider;
    var selectedIndex = dataProvider.getSelectedIndexes();
    var objects = dataProvider.viewModelCollection.getLoadedViewModelObjects();

    var objectToSelectAfterDelete;
    if ( objects.length > 1 ) {
        if ( selectedIndex[0] === 0 ) {
            objectToSelectAfterDelete = objects[selectedIndex[0] + 1];
        } else {
            objectToSelectAfterDelete = objects[selectedIndex[0] - 1];
        }
    }
    var remainingObjects = _.difference( objects, dataProvider.selectedObjects );
    //set similarClause warning false if the similar clause is deleted
    if ( dataProvider.selectedObjects[0].isRepeated ) {
        data.exactlySameClauseWarning.dbValue = false;
    }
    eventBus.publish( 'RevisionRuleAdminPanel.tagRevisionRuleAsModified', null );
    data.clauses = remainingObjects;
    dataProvider.update( remainingObjects, remainingObjects.length );
    //Select the nearest clause
    if ( objectToSelectAfterDelete ) {
        dataProvider.selectionModel.setSelection( objectToSelectAfterDelete );
    }
};

/**
 *  Select the first clause
 *
 * @param {Object} dataprovider - dataprovider showing the list of clauses
 *
 */
export let selectFirstClause = function( dataprovider ) {
    var selectionModel = dataprovider.selectionModel;
    var viewModelCollection = dataprovider.getViewModelCollection();
    var loadedVMObjs = viewModelCollection.getLoadedViewModelObjects();
    if ( loadedVMObjs.length > 0 ) {
        selectionModel.setSelection( loadedVMObjs[0] );
    }
};

/**
 * scroll the newly added clause in view
 *
 *
 */
export let scrollToBottom = function() {
    var ctx = revisionRuleAdminCtx.getCtx();
    if ( ctx.RevisionRuleAdmin && ctx.RevisionRuleAdmin.shouldEnableAutoScroll ) {
        ctx.RevisionRuleAdmin.shouldEnableAutoScroll = false;
        var openedClauseElement = $( '[panel-id=\'RevisionRuleAdminPanel\'] > .aw-base-scrollPanel [collapsed=\"false\"]' );

        var parentElement = $( '[panel-id=\'RevisionRuleAdminPanel\'] > .aw-base-scrollPanel' );

        if ( $( openedClauseElement ) && $( openedClauseElement )[0].offsetTop ) {
            var offsetOpenedClauseElement = $( openedClauseElement )[0].offsetTop;
        }

        if ( $( parentElement ) && $( parentElement )[0].offsetTop ) {
            var offsetParentElement = $( parentElement )[0].offsetTop;
        }

        if ( offsetOpenedClauseElement && offsetParentElement ) {
            $( parentElement ).scrollTop( offsetOpenedClauseElement - offsetParentElement );
        }
    }
};

export let getUpdatedClauses = function( data ) {
    data.clauses.forEach( function( entry ) {
        if ( entry.entryType === 3 && entry.revRuleEntryKeyToValue && entry.revRuleEntryKeyToValue.today !== 'true' && entry.revRuleEntryKeyToValue.date && entry.revRuleEntryKeyToValue.date !== '' ) {
            // Date - Convert client locale to UTC
            var clientLocaleDateString = entry.revRuleEntryKeyToValue.date;
            if ( isNaN( Date.parse( clientLocaleDateString ) ) ) {
                clientLocaleDateString = clientLocaleDateString.replace( /-/g, ' ' );
            }
            var date = new Date( clientLocaleDateString );
            if ( date.getFullYear() < 1900 ) {
                date = new Date( 1900, 0, 1 );
            }
            var gmtDate = _convertDate( date.getTime() );
            var gmtDateString = gmtDate.toString();
            entry.revRuleEntryKeyToValue.date = gmtDateString;
        }
    } );
    return omitUnwantedProperties( data.clauses, [ '$$hashKey', 'selected', 'modified' ] );
};

/**
 * Update the revision rule in the Revision rule panel if any of the revision rule, unit effectivity, date effectivity or end item is changed from header
 *
 */
export let updateRevisionRuleInThePanel = function() {
    var ctx = revisionRuleAdminCtx.getCtx();
    var isTransientRuleChangedToBaseRevRule = _.get( ctx, 'aceActiveContext.context.supportedFeatures.Awb0TransientRevisionRuleInNonIntropModeFeature' );
    if ( isTransientRuleChangedToBaseRevRule ) {
        var displayMessage = _localeTextBundle.transientRuleChangedToBaseRuleMsg;
        messagingSvc.showInfo( displayMessage );
    }
    var revRulePanleToBeRefreshed = isRevisionRulePanelToBeRefreshed();
    if ( revRulePanleToBeRefreshed ) {
        if ( ctx.aceActiveContext.context.productContextInfo.props.awb0CurrentRevRule !== undefined ) {
            var revRuleUid = ctx.RevisionRuleAdmin.currentlySelectedRevisionRule.uid;
            var transientRevRule = ctx.aceActiveContext.context.productContextInfo.props.awb0CurrentRevRule;

            if ( transientRevRule.dbValues !== undefined && transientRevRule.dbValues[0] !== revRuleUid ) {
                var currentlySelectedRevisionRule = tcViewModelObjectService.createViewModelObjectById( transientRevRule.dbValues );
                revisionRuleAdminCtx.updateRevRuleAdminPartialCtx( 'currentlySelectedRevisionRule', currentlySelectedRevisionRule );
                eventBus.publish( 'RevisionRuleAdminPanel.UpdateDataProvider' );
            }
        }
    }
};

export let closeRevisionRulePanel = function( isClauseModified ) {
    if ( isClauseModified ) {
        var isClauseModified = isClauseModified.dbValue;
        if ( isClauseModified === false ) {
            var eventData = {
                source: 'navigationPanel'
            };
            eventBus.publish( 'complete', eventData );
        }
    }
};

export let isClauseModified = function( data ) {
    var orgClauses = revisionRuleAdminCtx.getRevRuleAdminCtx( 'originalClauses' );
    var currentClauses = omitUnwantedProperties( data.clauses, [ '$$hashKey', 'selected' ] );
    var noChangesToClauses = _.isEqual( orgClauses, currentClauses );
    data.isClauseModified.dbValue = !noChangesToClauses;

    if ( noChangesToClauses ) {
        if ( data.revRuleName ) {
            var ctx = revisionRuleAdminCtx.getCtx();
            data.revRuleName.uiValue = ctx.RevisionRuleAdmin.currentlySelectedRevisionRule.props.object_string.dbValues[0];
        }
    }
};

var loadConfiguration = () => {
    _localeTextBundle = localeSvc.getLoadedText( app.getBaseUrlPath() + '/i18n/RevisionRuleAdminConstants' );
};

loadConfiguration();

export default exports = {
    getRevisionRule,
    tagRevisionRuleAsModified,
    processClauses,
    getUpdatedRevisionRule,
    saveRevRuleIfRequiredAndConfigureProduct,
    getModifiedRevisionRuleName,
    activateRevisionRuleAdminPanel,
    moveClauseUp,
    moveClauseDown,
    deleteClause,
    selectFirstClause,
    getUpdatedClauses,
    closeRevisionRulePanel,
    isClauseModified,
    updateRevisionRuleClauseSelection,
    scrollToBottom,
    updateRevisionRuleInThePanel,
    cancelModification

};
/**
 * @memberof NgServices
 * @member acerevisionRuleAdminPanelService
 */
app.factory( 'revisionRuleAdminPanelService', () => exports );
