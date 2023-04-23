// @<COPYRIGHT>@
// ==================================================
// Copyright 2021.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/* global
 */

/**
 * JS Service defined to handle Item Report Configuration related method execution only.
 *
 *
 * @module js/configureItemReportService
 */
import app from 'app';
import appCtxService from 'js/appCtxService';
import dmSvc from 'soa/dataManagementService';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import repCommonSrvc from 'js/reportsCommonService';
import showRepSrvc from 'js/showReportService';
import uwPropSrv from 'js/uwPropertyService';
import messagingService from 'js/messagingService';
import popUpSvc from 'js/popupService';
import AwPromiseService from 'js/awPromiseService';

var exports = {};

export let setRootClass = function( data, selection ) {
    if ( selection.length > 0 ) {
        data.rootClass = [];
        data.rootClass.push( selection[0] );
        selection[0].selected = false;
        data.activeView = 'ConfigureItemReportPanel';

        data.dataProviders.rootClassProvider.update( data.rootClass );
        data.dataProviders.rootClassProvider.selectNone();

        //update partial Ctx...
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.rootObjectSelected', selection[0] );
    }
};

export let setSampleRootObject = function( data, selection ) {
    if ( selection.length > 0 ) {
        data.rootClassSample = [];
        data.rootClassSample.push( selection[0] );
        selection[0].selected = false;
        data.activeView = 'ConfigureItemReportPanel';

        data.dataProviders.rootClassSampleProvider.update( data.rootClassSample );
        data.dataProviders.rootClassSampleProvider.selectNone();

        //update partial Ctx...
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.rootSampleObjectSelected', selection[0] );

        updateSegmentTree( data );
    }
};

var processRemoveClassSampleAction = function( data, reportParams ) {
    data.rootClassSample = [];
    data.dataProviders.rootClassSampleProvider.update( data.rootClassSample );
    if ( reportParams.rootSampleObjectSelected ) {
        delete reportParams.rootSampleObjectSelected;
    }

    data.dataforSegmentTree = [];
    data.segments = [];

    if ( reportParams.ReportDefProps && reportParams.ReportDefProps.ReportSegmentParams ) {
        delete reportParams.ReportDefProps.ReportSegmentParams;
    }

    if ( reportParams.ReportDefProps && reportParams.ReportDefProps.ReportClassParameters ) {
        delete reportParams.ReportDefProps.ReportClassParameters;
    }

    if ( reportParams.segments ) {
        delete reportParams.segments;
    }
    data.recreateSegementsPanel = true;
    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.bomInSegmentAdded', false );
    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', reportParams );
};

export let continueClassRemoveAction = function( data ) {
    var reportParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );

    data.rootClass = [];
    data.dataProviders.rootClassProvider.update( data.rootClass );
    if ( reportParams.rootObjectSelected ) {
        delete reportParams.rootObjectSelected;
    }
    processRemoveClassSampleAction( data, reportParams );
};

export let continueSampleObjectRemoveAction = function( data ) {
    var reportParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );

    processRemoveClassSampleAction( data, reportParams );
};

export let saveItemReport = function( data ) {
    console.log( data );
};

/**
 * Get the last segment
 *
 * @param {Data} data - the data of the ViewModel
 * @returns {Segment} the last segment
 */
function getLastSegment( data ) {
    if ( data.segments && data.segments.length > 0 ) {
        return data.segments[data.segments.length - 1];
    }
    return null;
}
/**
 * Setup's parameters for existing segments
 * @param {*} data   -
 */
function setSegmentParameters( data ) {
    var segmentParams = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps.ReportSegmentParams' );
    var needToCreateMoreSegment = false;
    if ( segmentParams && data.segments.length < segmentParams.length ) {
        var index = data.segments.length;
        setDbAndUiValue( data.segment.props.fnd0RelationOrReference, segmentParams[index].RelOrRef );
        data.segment.props.fnd0RelationOrReference.valueUpdated = true;

        setDbAndUiValue( data.segment.props.fnd0Direction, segmentParams[index].Direction );
        data.segment.props.fnd0Direction.valueUpdated = true;

        setDbAndUiValue( data.segment.props.fnd0DestinationType, segmentParams[index].Destination );
        data.segment.props.fnd0DestinationType.selectedLovEntries = [ {
            propDisplayDescription: segmentParams[index].Destination
        } ];
        data.segment.props.fnd0DestinationType.valueUpdated = true;

        if ( segmentParams[index].RelRefType === 'BOM' ) {
            data.segment.bomInSegment = true;
        }

        data.segment.existing = true;

        if ( data.segments.length + 1 !== segmentParams.length ) {
            needToCreateMoreSegment = true;
        }
    }
    return needToCreateMoreSegment;
}

/**
 * Process segment creation and add
 *
 * @param {*} data
 */
export let processAndAddNewSegment = function( data, eventData ) {
    if ( eventData && eventData.segData !== undefined ) {
        data = eventData.segData;
    }

    if ( !data.segments ) {
        data.segments = [];
    }

    var lastSeg = getLastSegment( data );
    var selectedRoot = appCtxService.getCtx( 'ReportsContext.reportParameters.rootSampleObjectSelected' );
    var rootType = selectedRoot ? selectedRoot.type : '';
    if ( lastSeg && lastSeg.bomInSegment ) {
        data.segment.props.fnd0SourceType.dbValue = lastSeg.props.fnd0SourceType.dbValue;
        data.segment.props.fnd0SourceType.valueUpdated = true;
    } else {
        data.segment.props.fnd0SourceType.dbValue = lastSeg ? lastSeg.props.fnd0DestinationType.dbValue :
            rootType;
    }

    if ( data.segment.props.fnd0SourceType && ( data.segment.props.fnd0SourceType.valueUpdated === false ||
        data.segment.props.fnd0SourceType.valueUpdated === undefined ) ) {
        data.segment.props.fnd0SourceType.valueUpdated = true;
    }

    data.segment.index = data.segments.length + 1;
    data.segment.caption = data.i18n.segment + ' ' + ( data.segments.length + 1 );
    data.segment.props.fnd0Direction.isEditable = true;
    data.segment.props.fnd0SourceType.isEditable = true;
    data.segment.props.fnd0RelationOrReference.isEditable = true;
    data.segment.props.fnd0DestinationType.isEditable = true;

    if ( data.segment.props.fnd0Direction && ( data.segment.props.fnd0Direction.valueUpdated === false ||
        data.segment.props.fnd0Direction.valueUpdated === undefined ) ) {
        data.segment.props.fnd0Direction.valueUpdated = true;
    }

    data.segment.props.fnd0Direction.dbValue = 'true';
    data.segment.props.fnd0Direction.propertyLabelDisplay = 'PROPERTY_LABEL_AT_RIGHT';


    if ( data.segment.props.fnd0IncludedLO && ( data.segment.props.fnd0IncludedLO.valueUpdated === false ||
        data.segment.props.fnd0IncludedLO.valueUpdated === undefined ) ) {
        data.segment.props.fnd0IncludedLO.valueUpdated = true;
    }
    data.segment.props.fnd0IncludedLO.dbValue = 'true';

    //In case of Edit or re-openinging the panel
    //we need to set segment parameters.
    var needMoreSegment = setSegmentParameters( data );
    data.segments.push( data.segment );

    appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.segments', data.segments );
    data.showSegment.dbValue = true;
    data.totalFound = 0;
    if ( data.recreateSegementsPanel ) {
        data.recreateSegementsPanel = false;
    }
    //resetting revRule in context before adding to SOA payload. This is until we can send revRules during create
    exports.setCtxPayloadRevRule( '' );

    if ( needMoreSegment ) {
        eventBus.publish( 'rb0segmentselector.addNewSegment' );
    } else if ( data.segment.existing ) {
        eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
    }
};

/**
 * Set a segment's property with dbValue and uiValue
 *
 * @param {Object} prop - the property
 * @param {String} value - the value
 */
function setDbAndUiValue( prop, value ) {
    prop.dbValue = value;
    prop.uiValue = value;
}

/**
 * Clear the current segment
 *
 * @param {Data} subPanelContext - the data of the ViewModel
 */
export let clearRelationSegment = function( subPanelContext, checkboxVal ) {
    if ( subPanelContext && subPanelContext.props.fnd0Direction.dbValue === 'false' ) {
        checkboxVal.dbValue = false;
    }
    if ( subPanelContext && subPanelContext.existing ) {
        subPanelContext.existing = false;
        setDbAndUiValue( subPanelContext.props.fnd0DestinationType, '' );
        eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
    } else {
        setDbAndUiValue( subPanelContext.props.fnd0RelationOrReference, '' );
        setDbAndUiValue( subPanelContext.props.fnd0DestinationType, '' );
    }
};

/**
 *returns traversal path
 *@returns {String} traversal path
 */
export let getTraversalPath = function() {
    var traversePath = { relationsPath: [] };
    var ctxParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    if ( ctxParams.segments ) {
        ctxParams.segments.forEach( segment => {
            var segPayload;
            if ( segment.bomInSegment ) {
                segPayload = constructBomSegPayload( segment, ctxParams );
            } else {
                segPayload = constructNonBomSegPayload( segment, ctxParams );
            }
            traversePath.relationsPath.push( segPayload );
        } );
    } else if ( ctxParams.ReportDefProps && ctxParams.ReportDefProps.ReportSegmentParams ) {
        ctxParams.ReportDefProps.ReportSegmentParams.forEach( segmentParam => {
            var segPayload = {};
            if( segmentParam.RelRefType === 'BOM' ) {
                segPayload = constructBomSegPayload( undefined, undefined, segmentParam );
            } else {
                segPayload = constructNonBomSegPayload( undefined, undefined, segmentParam );
            }
            traversePath.relationsPath.push( segPayload );
        } );
    }
    return JSON.stringify( traversePath );
};

export let callGetCategoriesForReports = function( response ) {
    return showRepSrvc.callRepGetCategories( response );
};

/**
 * Prepare and send segment tree.
 * TODO: Refactor to handle Segment tree creation from Context. Remove duplicate loop.
 *
 * @param {*} data -
 */
export let updateSegmentTree = function( data ) {
    var repParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    var rootType = repParams.rootObjectSelected ? repParams.rootObjectSelected.props.object_string.dbValues[0] : '';
    data.dataforSegmentTree = [];
    var tree = {
        label: rootType + ' (' + data.i18n.parentSource + ')',
        expanded: true,
        children: []
    };

    var nextNode = null;
    var segments = repParams.segments;

    if ( repParams.ReportDefProps && repParams.ReportDefProps.ReportSegmentParams ) {
        _.forEach( repParams.ReportDefProps.ReportSegmentParams, function( segment ) {
            var node = {};
            node.label = segment.TreeVal;
            node.expanded = true;
            node.children = [];
            if ( nextNode === null ) {
                tree.children.push( node );
                nextNode = {
                    children: node.children
                };
            } else {
                nextNode.children.push( node );
                nextNode = node;
            }
        } );
    } else if ( segments && segments.length > 0 ) {
        _.forEach( segments, function( segment ) {
            var node = {};
            node.expanded = true;
            node.children = [];
            if ( !segment.bomInSegment ) {
                var objType = segment.props.fnd0DestinationType.selectedLovEntries[0].propDisplayDescription;
                var relRefValue = segment.props.fnd0RelationOrReference.dbValue;
                node.label = objType + ' (' + relRefValue + ')';
            }
            if ( segment.bomInSegment ) {
                node.label = data.i18n.structure;
            }
            if ( nextNode === null ) {
                tree.children.push( node );
                nextNode = {
                    children: node.children
                };
            } else {
                nextNode.children.push( node );
                nextNode = node;
            }
        } );
    }
    data.dataforSegmentTree.push( tree );
};

/**
 * Updates Tree Class, Sample and Tree when Saved Report is opened
 * for editing.
 * @param {*} data
 * @param {*} classTypeObject
 * @param {*} classSampleObject
 */
function setItemReportClassAndSampleACtion( data, classTypeObject, classSampleObject ) {
    data.rootClass = [];
    data.rootClass.push( classTypeObject );
    data.dataProviders.rootClassProvider.update( data.rootClass );
    data.dataProviders.rootClassProvider.selectNone();

    var panelId;
    var panelTitle;
    if ( classSampleObject !== null ) {
        data.rootClassSample = [];
        data.rootClassSample.push( classSampleObject );
        data.dataProviders.rootClassSampleProvider.update( data.rootClassSample );
        data.dataProviders.rootClassSampleProvider.selectNone();

        panelId = 'SetLayoutTabPage';
        panelTitle = data.i18n.layout;
    } else if ( classSampleObject === null ) {
        panelId = 'Rb0RootSampleSelectorSub';
        panelTitle = data.i18n.selectSample;
    }

    //Update Tree..
    updateSegmentTree( data );
    if ( appCtxService.ctx.state.params.referenceId === 'edit' && appCtxService.ctx.ReportsContext.showPreview === false ) {
        eventBus.publish( 'awPanel.navigate', {
            destPanelId: panelId,
            title: panelTitle,
            supportGoBack: true,
            recreatePanel: false
        } );
    }
}

/**
 *
 * Setups the Configure Report panel.
 * @param {*} data-
 * @param {*} ctx-
 */
export let setupConfigureItemRepPanel = function( data, ctx ) {
    var repParams = ctx.ReportsContext.reportParameters;
    if ( repParams && repParams.rootObjectSelected && repParams.rootSampleObjectSelected ) {
        setItemReportClassAndSampleACtion( data, repParams.rootObjectSelected, repParams.rootSampleObjectSelected );
    } else if ( repParams && repParams.ReportDefProps && repParams.ReportDefProps.ReportClassParameters.rootClassUid && repParams.ReportDefProps.ReportClassParameters.rootSampleUid ) {
        dmSvc.loadObjects( [ repParams.ReportDefProps.ReportClassParameters.rootClassUid, repParams.ReportDefProps.ReportClassParameters.rootSampleUid ] ).then( function() {
            repParams.rootObjectSelected = cdm.getObject( repParams.ReportDefProps.ReportClassParameters.rootClassUid );
            repParams.rootSampleObjectSelected = cdm.getObject( repParams.ReportDefProps.ReportClassParameters.rootSampleUid );

            setItemReportClassAndSampleACtion( data, repParams.rootObjectSelected, repParams.rootSampleObjectSelected );
            appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', repParams );
        },
            function() {
                repParams.rootObjectSelected = cdm.getObject( repParams.ReportDefProps.ReportClassParameters.rootClassUid );
                repParams.rootSampleObjectSelected = cdm.getObject( repParams.ReportDefProps.ReportClassParameters.rootSampleUid );

                setItemReportClassAndSampleACtion( data, repParams.rootObjectSelected, repParams.rootSampleObjectSelected );
                appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', repParams );
                if ( repParams.rootSampleObjectSelected === null ) {
                    messagingService.reportNotyMessage( data, data._internal.messages, 'showSampleObjectMissingMessage' );
                }
            } );
    }
};

/**
 *
 * @param {*} data
 */
export let buildSegmentTreeAndNavigate = function( data ) {
    var repParams = appCtxService.getCtx( 'ReportsContext.reportParameters' );
    if ( repParams.ReportDefProps && repParams.ReportDefProps.ReportSegmentParams && repParams.ReportDefProps.ReportSegmentParams.length < data.segments.length ) {
        for ( var i = repParams.ReportDefProps.ReportSegmentParams.length; i < data.segments.length; i++ ) {
            var segment = data.segments[i];
            var objType = segment.props.fnd0DestinationType.selectedLovEntries[0].propDisplayDescription;
            var relRefValue = segment.props.fnd0RelationOrReference.dbValue;
            var label = objType + '(' + relRefValue + ')';
            repParams.ReportDefProps.ReportSegmentParams.push( {
                TreeVal: label
            } );
        }
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters', repParams );
    }
    updateSegmentTree( data );
    data.activeView = 'ConfigureItemReportPanel';
};

export let initiateVerifyTraversal = function( data ) {
    var shouldInitTraversal = false;
    _.forEach( data.segments, function( segment ) {
        if ( segment.props.fnd0RelationOrReference.dbValue.length > 0 && segment.props.fnd0DestinationType.dbValue.length > 0 ) {
            shouldInitTraversal = true;
        } else if ( shouldInitTraversal ) {
            shouldInitTraversal = false;
        }
    } );

    if ( shouldInitTraversal ) {
        eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
    }
};

export let removeTraverseSegment = function( data ) {
    if ( data.segments && data.segments.length > 1 ) {
        let removedSeg = data.segments.pop();
        data.segment = data.segments[data.segments.length - 1];
        if( removedSeg.bomInSegment ) {
            appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.bomInSegmentAdded', false );
            eventBus.publish( 'rb0BomInSegmentCheckboxIsFalse' );
        }
        eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
    }
};

export let flipTraverseSegmentPreview = function( data ) {
    data.showPreview.dbValue = !data.showPreview.dbValue;
};

export let updateConfigItemProps = function( data, ctx ) {
    if ( ctx.ReportsContext.reportParameters && ctx.ReportsContext.reportParameters.ReportDefProps ) {
        if ( ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart1 &&
            ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart1.ChartPropName !== data.chart1LabelTxt.dbValue ) {
            uwPropSrv.updateDisplayValues( data.chart1LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart1.ChartPropName ] );
            uwPropSrv.setValue( data.chart1LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart1.ChartPropName ] );
        }
        if ( ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart2 &&
            ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart2.ChartPropName !== data.chart2LabelTxt.dbValue ) {
            uwPropSrv.updateDisplayValues( data.chart2LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart2.ChartPropName ] );
            uwPropSrv.setValue( data.chart2LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart2.ChartPropName ] );
        }
        if ( ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart3 &&
            ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart3.ChartPropName !== data.chart3LabelTxt.dbValue ) {
            uwPropSrv.updateDisplayValues( data.chart3LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart3.ChartPropName ] );
            uwPropSrv.setValue( data.chart3LabelTxt, [ ctx.ReportsContext.reportParameters.ReportDefProps.ReportChart3.ChartPropName ] );
        }
    }
};

export let populateSegmentDataWithBomInfo = function( subPanelContext, checkboxVal ) {
    if ( checkboxVal && checkboxVal.dbValue ) {
        subPanelContext.bomInSegment = true;
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.bomInSegmentAdded', true );
        eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
        eventBus.publish( 'rb0BomInSegmentCheckboxIsTrue' );
    } else {
        subPanelContext.bomInSegment = false;
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.bomInSegmentAdded', false );
        eventBus.publish( 'rb0BomInSegmentCheckboxIsFalse' );
        eventBus.publish( 'rb0SegmentSelector.verifyTraversal' );
    }
};

let constructBomSegPayload = ( segment, ctxParams, dashboardSegmentParams ) => {
    if( !dashboardSegmentParams ) {
        return {
            searchMethod: repCommonSrvc.getRelationTraversalType( segment, ctxParams ),
            objectType: segment.props.fnd0SourceType.dbValue,
            revisionRule: exports.getCtxPayloadRevRule()
        };
    }
    return {
            searchMethod: dashboardSegmentParams.RelRefType,
            objectType: dashboardSegmentParams.Source,
            revisionRule: exports.getCtxPayloadRevRule()
        };
};

let constructNonBomSegPayload = ( segment, ctxParams, dashboardSegmentParams ) => {
    if( !dashboardSegmentParams ) {
        return {
            searchMethod: repCommonSrvc.getRelationTraversalType( segment, ctxParams ),
            relationName: segment.props.fnd0RelationOrReference.dbValue,
            objectType: segment.props.fnd0DestinationType.dbValue
        };
    }
    return {
        objectType: dashboardSegmentParams.Destination,
        relationName: dashboardSegmentParams.RelOrRef,
        searchMethod: dashboardSegmentParams.RelRefType
    };
};

export let showEditReportCriteria = ( popupData, commandData ) => {
    var deferred = AwPromiseService.instance.defer();
    popupData.subPanelContext = {};
    popupData.subPanelContext.revRuleLovList = commandData.revRuleLovList;
    var reportSearchCriteriaStr = appCtxService.getCtx( 'ReportsContext.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria' );
    var reportSearchCriteria = JSON.parse( reportSearchCriteriaStr );
    if ( reportSearchCriteria.relationsPath && reportSearchCriteria.relationsPath.length > 0 && reportSearchCriteria.relationsPath[0].searchMethod === 'BOM' ) {
        var appliedRevRule = reportSearchCriteria.relationsPath[0].revisionRule === '' ? appCtxService.getCtx( 'userSession' ).props.awp0RevRule.displayValues[0] : reportSearchCriteria.relationsPath[0].revisionRule;
        popupData.subPanelContext.appliedRevRuleObj = _.find( commandData.revRuleLovList, ( revRuleObj ) => {
            return revRuleObj.propDisplayValue === appliedRevRule;
        } );
    }
    popUpSvc.show( popupData ).then( ( id ) => {
        appCtxService.updatePartialCtx( 'ReportsContext.criteriaPopupId', id );
        deferred.resolve( {} );
    } );
    return deferred.promise;
};

export let saveEditReportCriteria = ( revRuleProp ) => {
    var newRevRule = revRuleProp.displayValues[0];
    exports.setCtxPayloadRevRule( newRevRule );
    eventBus.publish( 'showReportImage.editReportCriteriaIssued' );
};

export let initSegmentPropertyVM = ( checkboxEnableProp, bomInSegment, bomCheckbox ) => {
    var bomSegAlreadyAdded = appCtxService.getCtx( 'ReportsContext.reportParameters.bomInSegmentAdded' );
    if ( bomSegAlreadyAdded ) {
        checkboxEnableProp.dbValue = false;
        return;
    }
    if ( bomInSegment ) {
        bomCheckbox.dbValue = true;
        appCtxService.updatePartialCtx( 'ReportsContext.reportParameters.bomInSegmentAdded', true );
        eventBus.publish( 'rb0BomInSegmentCheckboxIsTrue' );
    }
};

export let toggleCheckboxVisibilityWhenTrue = ( checkboxEnProp, bomExpansionCheckbox ) => {
    if ( !bomExpansionCheckbox.dbValue ) {
        checkboxEnProp.dbValue = false;
    }
};

export let toggleCheckboxVisibilityWhenFalse = ( checkboxEnProp ) => {
    checkboxEnProp.dbValue = true;
};

export let getRevRuleLovListFromLovValues = ( responseData ) => {
    var revRuleLovList = [];
    if ( responseData && responseData.lovValues && responseData.lovValues.length > 0 ) {
        responseData.lovValues.map( ( revRuleObj ) => {
            if ( revRuleObj.propDisplayValues && revRuleObj.propDisplayValues.object_name ) {
                var revRuleVMObj = {
                    propDisplayValue: revRuleObj.propDisplayValues.object_name[0],
                    propInternalValue: revRuleObj.uid,
                    dbValue: revRuleObj.uid,
                    uid: revRuleObj.uid
                };
                revRuleLovList.push( revRuleVMObj );
            }
        } );
    }
    return revRuleLovList;
};

export let setCtxPayloadRevRule = ( newRevRule ) => {
    var reportsCtx = appCtxService.getCtx( 'ReportsContext' );
    if ( reportsCtx && reportsCtx.reportParameters && reportsCtx.reportParameters.ReportDefProps && reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo ) {
        let existingSearchCriteiraString = reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
        let existingSearchCriteriaJSON = {};
        try {
            existingSearchCriteriaJSON = JSON.parse( existingSearchCriteiraString );
        } catch( e ) {
            //Incorrect data, don't set revRule
            return;
        }
        let bomSegIndex =  _.findIndex( existingSearchCriteriaJSON.relationsPath, ( relationsPath ) => {
            return relationsPath.searchMethod === 'BOM';
        } );
        if( bomSegIndex >= 0 ) {
            existingSearchCriteriaJSON.relationsPath[bomSegIndex].revisionRule = newRevRule;
        }
        reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria = JSON.stringify( existingSearchCriteriaJSON );
    }
    appCtxService.registerCtx( 'ReportsContext', reportsCtx );
};

export let getCtxPayloadRevRule = () => {
    var reportsCtx = appCtxService.getCtx( 'ReportsContext' );
    if ( reportsCtx && reportsCtx.reportParameters && reportsCtx.reportParameters.ReportDefProps && reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo ) {
        let existingSearchCriteiraString = reportsCtx.reportParameters.ReportDefProps.ReportSearchInfo.SearchCriteria;
        let existingSearchCriteriaJSON = {};
        try {
            existingSearchCriteriaJSON  = JSON.parse( existingSearchCriteiraString );
        } catch( e ) {
            //incorrect data, return default value
            return '';
        }
        let bomSegIndex =  _.findIndex( existingSearchCriteriaJSON.relationsPath, ( relationsPath ) => {
            return relationsPath.searchMethod === 'BOM';
        } );
        if( bomSegIndex >= 0 ) {
            return existingSearchCriteriaJSON.relationsPath[bomSegIndex].revisionRule;
        }
    }
    return '';
};

export let setSaveActionCompleteInContext = () => {
    appCtxService.updatePartialCtx( 'ReportsContext.saveReportConfigActionComplete', true );
};

export let updateDataProviderOnError = ( data, i18n ) => {
    data.noResults = true;
    data.noResultsFound = i18n;
};

/**
 * Service variable initialization
/**
 * @param {any} appCtxService - the
 * @param  {any} listBoxService - the
 *
 * @returns {any} exports - the Exports.
 */
export default exports = {
    saveItemReport,
    setRootClass,
    continueClassRemoveAction,
    setSampleRootObject,
    continueSampleObjectRemoveAction,
    processAndAddNewSegment,
    clearRelationSegment,
    getTraversalPath,
    callGetCategoriesForReports,
    updateSegmentTree,
    setupConfigureItemRepPanel,
    buildSegmentTreeAndNavigate,
    initiateVerifyTraversal,
    removeTraverseSegment,
    flipTraverseSegmentPreview,
    updateConfigItemProps,
    populateSegmentDataWithBomInfo,
    showEditReportCriteria,
    saveEditReportCriteria,
    initSegmentPropertyVM,
    toggleCheckboxVisibilityWhenTrue,
    toggleCheckboxVisibilityWhenFalse,
    getRevRuleLovListFromLovValues,
    setCtxPayloadRevRule,
    getCtxPayloadRevRule,
    setSaveActionCompleteInContext,
    updateDataProviderOnError
};
app.factory( 'configureitemreportservice', () => exports );
