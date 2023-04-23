// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 *

 * @module js/Acp0IndustryRuleService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import appCtxSvc from 'js/appCtxService';
import dms from 'soa/dataManagementService';
import soaSvc from 'soa/kernel/soaService';
import editHandlerService from 'js/editHandlerService';
import messagingService from 'js/messagingService';
import tcVmoService from 'js/tcViewModelObjectService';
import uwPropertySvc from 'js/uwPropertyService';
import _ from 'lodash';

'use strict';

var exports = {};
var _data = null;

/**
 * Gets the underlying object for the selection. For selection of an occurrence in a BOM, the underlying object is
 * typically an SPCCheck Revision object. If there is no underlying object, the selected object is returned.
 *
 * @param {object} ctx - Application Context
 *
 */
var getUnderlyingObject = function( selected ) {
    var underlyingObj = null;
    if( selected ) {
        var underlyingObjProp = selected.props.awb0UnderlyingObject;
        if( !_.isUndefined( underlyingObjProp ) ) {
            underlyingObj = cdm.getObject( underlyingObjProp.dbValues[ 0 ] );
        } else {
            underlyingObj = selected;
        }
    }
    return underlyingObj;
};

/**
 * Get the industry rules from selcted object
 */
export let getIndustryRuleName = function() {
    var selectedobject = appCtxSvc.ctx.xrtSummaryContextObject;
    var industryRule = null;
    if( !_.isUndefined( hasUnderlyingObject( selectedobject ) ) ) {
        industryRule = selectedobject.props.acp0ElementIndustryRule.dbValue;
    } else {
        industryRule = selectedobject.props.acp0IndustryRule.dbValue;
    }
    return industryRule;
};

var hasUnderlyingObject = function( selected ) {
    var underlyingObjProp = selected.props.awb0UnderlyingObject;
    return underlyingObjProp;
};

var getCharTypeFromSPCCheck = function() {
    // To check selected object is runtime or persistent
    var selectedObject = appCtxSvc.ctx.xrtSummaryContextObject;
    var charTypeProp = null;
    if( !_.isUndefined( hasUnderlyingObject( selectedObject ) ) ) {
        charTypeProp = selectedObject.props.acp0ElementCharType;
    } else {
        charTypeProp = selectedObject.props.acp0CharacteristicsType;
    }
    return charTypeProp;
};
/**
 *This method loads the standard rule object , reads its properties and saves it in data.ruleproperties array.
 *this array will be used by the view for displaying the standard rules.
 *
 */
export let processStandardIndustryRules = function( response ) {
    if( response.partialErrors || response.ServiceData && response.ServiceData.partialErrors ) {
        return response;
    }
    var industryrules = [];
    if( response.searchResultsJSON ) {
        var searchResults =  JSON.parse( response.searchResultsJSON );
        if( searchResults ) {
            var ruleUid = searchResults.objects[ 0 ].uid;
          var ruleObject =  cdm.getObject( ruleUid );
         if( ruleObject.props.acp0IndustryRuleDefinition &&  ruleObject.props.acp0IndustryRuleDefinition.dbValues ) {
            for( var i = 0; i < ruleObject.props.acp0IndustryRuleDefinition.dbValues.length; i++ ) {
                industryrules.push(
                {
                    displayName: ruleObject.props.acp0IndustryRuleDefinition.dbValues[i],
                    type: 'STRING'
                        }

                    );
                }
            }
        }
    }
    return industryrules;
};

/*
 *
 * Loads the acp0WestinghousRules and acp0Trend property of the selected spc check object before revealing the custom panel
 */
export let loadMainRulesPanelData = function( data ) {
    // need to re initalise isSubPanelObjectLoaded to false , dont remove
    data.isSubPanelObjectLoaded = false;
    // load the acp0WestinghousRules and acp0Trend property of the selected spc check object
    var objectsToLoad = [];
    objectsToLoad.push( getUnderlyingObject( appCtxSvc.ctx.xrtSummaryContextObject ) );

    tcVmoService.getViewModelProperties( objectsToLoad, [ 'acp0Trend', 'acp0Run', 'acp0LessThanPercentage', 'acp0MoreThanPercentage', 'acp0SamplesSize', 'acp0ControlLimits', 'acp0WarningLimits', 'acp0SpecificationLimits', 'acp0WestinghousRules', 'acp0CharacteristicsType', 'acp0MiddleThird', 'acp0EnableRun', 'acp0EnableTrend' ]  ).then(
        function() {
            data.isSubPanelObjectLoaded = true;
        } );
};

/**
 * Inialises the trend and 10 westinghouse boolean properties , we set the edit state ,enabled state,and property label here
 *
 */
export let populatePanelData = function( data ) {
    // To check selected object is runtime or persistent
    var selectedObject = appCtxSvc.ctx.xrtSummaryContextObject;
    if( !_.isUndefined( hasUnderlyingObject( selectedObject ) ) ) {
        selectedObject = getUnderlyingObject( selectedObject );
    }
    var charTypeProp = getCharTypeFromSPCCheck();
    if( charTypeProp.dbValue === 'Variable' ) {
        if( !selectedObject.ruleProperties ) {
            selectedObject.ruleProperties = {};
        }
        var activeEditHandler = editHandlerService.getActiveEditHandler();
        data.trendProperty.acp0EnableTrend = selectedObject.props.acp0EnableTrend;
        uwPropertySvc.setValue( data.trendProperty.acp0EnableTrend,  data.trendProperty.acp0EnableTrend.value );
        uwPropertySvc.setIsEditable(  data.trendProperty.acp0EnableTrend, true );
        uwPropertySvc.setIsEnabled( data.trendProperty.acp0EnableTrend, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.trendProperty.acp0EnableTrend, 'NO_PROPERTY_LABEL' );

        data.trendProperty.acp0Trend = selectedObject.props.acp0Trend;
        uwPropertySvc.setValue( data.trendProperty.acp0Trend,  data.trendProperty.acp0Trend.value );
        uwPropertySvc.setIsEditable(  data.trendProperty.acp0Trend, true );
        uwPropertySvc.setIsEnabled( data.trendProperty.acp0Trend,  activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.trendProperty.acp0Trend, 'PROPERTY_LABEL_AT_SIDE' );

        data.runProperty.acp0EnableRun = selectedObject.props.acp0EnableRun;
        uwPropertySvc.setValue( data.runProperty.acp0EnableRun,  data.runProperty.acp0EnableRun.value );
        uwPropertySvc.setIsEditable(  data.runProperty.acp0EnableRun, true );
        uwPropertySvc.setIsEnabled( data.runProperty.acp0EnableRun, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.runProperty.acp0EnableRun, 'NO_PROPERTY_LABEL' );

        data.runProperty.acp0Run = selectedObject.props.acp0Run;
        uwPropertySvc.setValue( data.runProperty.acp0Run,  data.runProperty.acp0Run.value );
        uwPropertySvc.setIsEditable(  data.runProperty.acp0Run, true );
        uwPropertySvc.setIsEnabled( data.runProperty.acp0Run, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.runProperty.acp0Run, 'PROPERTY_LABEL_AT_SIDE' );

        data.ruleProperties.acp0MiddleThird = selectedObject.props.acp0MiddleThird;
        uwPropertySvc.setValue( data.ruleProperties.acp0MiddleThird,  data.ruleProperties.acp0MiddleThird.value );
        uwPropertySvc.setIsEditable( data.ruleProperties.acp0MiddleThird, true );
        uwPropertySvc.setIsEnabled( data.ruleProperties.acp0MiddleThird, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.ruleProperties.acp0MiddleThird, 'PROPERTY_LABEL_AT_RIGHT' );

        data.ruleProperties.acp0LessThanPercentage = selectedObject.props.acp0LessThanPercentage;
        uwPropertySvc.setValue( data.ruleProperties.acp0LessThanPercentage,  data.ruleProperties.acp0LessThanPercentage.value );
        uwPropertySvc.setIsEditable(  data.ruleProperties.acp0LessThanPercentage, true );
        uwPropertySvc.setIsEnabled( data.ruleProperties.acp0LessThanPercentage, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.ruleProperties.acp0LessThanPercentage, 'PROPERTY_LABEL_AT_SIDE' );

        data.ruleProperties.acp0MoreThanPercentage = selectedObject.props.acp0MoreThanPercentage;
        uwPropertySvc.setValue( data.ruleProperties.acp0MoreThanPercentage,  data.ruleProperties.acp0MoreThanPercentage.value );
        uwPropertySvc.setIsEditable(  data.ruleProperties.acp0MoreThanPercentage, true );
        uwPropertySvc.setIsEnabled( data.ruleProperties.acp0MoreThanPercentage, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.ruleProperties.acp0MoreThanPercentage, 'PROPERTY_LABEL_AT_SIDE' );

        data.ruleProperties.acp0SamplesSize = selectedObject.props.acp0SamplesSize;
        uwPropertySvc.setValue( data.ruleProperties.acp0SamplesSize,  data.ruleProperties.acp0SamplesSize.value );
        uwPropertySvc.setIsEditable(  data.ruleProperties.acp0SamplesSize, true );
        uwPropertySvc.setIsEnabled( data.ruleProperties.acp0SamplesSize, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.ruleProperties.acp0SamplesSize, 'PROPERTY_LABEL_AT_SIDE' );

        data.ruleProperties.acp0ControlLimits = selectedObject.props.acp0ControlLimits;
        uwPropertySvc.setValue( data.ruleProperties.acp0ControlLimits,  data.ruleProperties.acp0ControlLimits.value );
        uwPropertySvc.setIsEditable(  data.ruleProperties.acp0ControlLimits, true );
        uwPropertySvc.setIsEnabled( data.ruleProperties.acp0ControlLimits, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.ruleProperties.acp0ControlLimits, 'PROPERTY_LABEL_AT_RIGHT' );

        data.ruleProperties.acp0WarningLimits = selectedObject.props.acp0WarningLimits;
        uwPropertySvc.setValue( data.ruleProperties.acp0WarningLimits,  data.ruleProperties.acp0WarningLimits.value );
        uwPropertySvc.setIsEditable(  data.ruleProperties.acp0WarningLimits, true );
        uwPropertySvc.setIsEnabled( data.ruleProperties.acp0WarningLimits, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.ruleProperties.acp0WarningLimits, 'PROPERTY_LABEL_AT_RIGHT' );

        data.ruleProperties.acp0SpecificationLimits = selectedObject.props.acp0SpecificationLimits;
        uwPropertySvc.setValue( data.ruleProperties.acp0SpecificationLimits,  data.ruleProperties.acp0SpecificationLimits.value );
        uwPropertySvc.setIsEditable(  data.ruleProperties.acp0SpecificationLimits, true );
        uwPropertySvc.setIsEnabled( data.ruleProperties.acp0SpecificationLimits, activeEditHandler.editInProgress() );
        uwPropertySvc.setPropertyLabelDisplay(  data.ruleProperties.acp0SpecificationLimits, 'PROPERTY_LABEL_AT_RIGHT' );

        for( var i = 0; i < 10; i++ ) {
           var dbValue = selectedObject.props.acp0WestinghousRules.dbValue.length > i ? selectedObject.props.acp0WestinghousRules.dbValue[i] : false;
           var displayValue =  selectedObject.props.acp0WestinghousRules.displayValues.length > i ? selectedObject.props.acp0WestinghousRules.displayValues[i] : 'False';


            data.ruleProperties['acp0westingRule_' + ( 1 + i )] =   uwPropertySvc.createViewModelProperty( 'acp0westingRule_' + ( 1 + i ), selectedObject.props.acp0WestinghousRules.propertyDisplayName + ' ' + ( 1 + i ), 'BOOLEAN', dbValue,
            displayValue );
            uwPropertySvc.setIsEditable( data.ruleProperties['acp0westingRule_' + ( 1 + i )], true );
            uwPropertySvc.setIsEnabled( data.ruleProperties['acp0westingRule_' + ( 1 + i )], activeEditHandler.editInProgress() );
            uwPropertySvc.setPropertyLabelDisplay( data.ruleProperties['acp0westingRule_' + ( 1 + i )], 'PROPERTY_LABEL_AT_RIGHT' );
        }
    } else {
        data.trendProperty = null;
        data.runProperty =  null;
    }

    // cache the rules object info in summary context
    // no better place to store this now
    // this info would be automatically removed when we unselect the object
    selectedObject.ruleProperties = data.ruleProperties;
    selectedObject.trendProperty =  data.trendProperty;
    selectedObject.runProperty =  data.runProperty;
    _data = data;
};


/**
 * Listen to edit events , if edit is about to happen then convert the custom rule properties into edit mode else disable edit mode and revert to initial values
 *
 * @return {ObjectArray} data the data object in scope
 */
export let processEditData = function( data ) {
    if( data.eventData.state === 'starting' ) {
        _.forEach( data.ruleProperties, function( prop ) {
        if( prop ) {
            prop.isEnabled = true;
            }
    } );
    _.forEach( data.trendProperty, function( prop ) {
        if( prop.propertyName === 'acp0Trend' ) {
            prop.isEnabled = data.trendProperty.acp0EnableTrend.dbValue;
        } else  if( prop ) {
            prop.isEnabled = true;
        }
    } );
    _.forEach( data.runProperty, function( prop ) {
        if( prop.propertyName === 'acp0Run' ) {
            prop.isEnabled = data.runProperty.acp0EnableRun.dbValue;
        } else  if( prop ) {
            prop.isEnabled = true;
        }
    } );
} else {
      initaliseValues();
    }
};

/**
 * Inialises values of 10 westinghouse boolean properties
 *
 */
export let initaliseValues = function(  ) {
if( appCtxSvc.ctx.xrtSummaryContextObject &&  appCtxSvc.ctx.xrtSummaryContextObject.type === 'Acp0SPCCheckRevision' && getCharTypeFromSPCCheck().dbValue === 'Variable' ) {
        var activeEditHandler = editHandlerService.getActiveEditHandler();
        //Loading properties on UI after edit save.
    var dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0EnableTrend.dbValue;
    uwPropertySvc.setValue( _data.trendProperty.acp0EnableTrend,  dbValue );
    uwPropertySvc.setIsEditable( _data.trendProperty.acp0EnableTrend, true );
    uwPropertySvc.setIsEnabled( _data.trendProperty.acp0EnableTrend, activeEditHandler.editInProgress() );

    dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0Trend.dbValue;
    uwPropertySvc.setValue( _data.trendProperty.acp0Trend,  dbValue );
    uwPropertySvc.setIsEditable( _data.trendProperty.acp0Trend, true );
    uwPropertySvc.setIsEnabled( _data.trendProperty.acp0Trend, activeEditHandler.editInProgress() );

    dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0EnableRun.dbValue;
    uwPropertySvc.setValue( _data.runProperty.acp0EnableRun,  dbValue );
    uwPropertySvc.setIsEditable( _data.runProperty.acp0EnableRun, true );
    uwPropertySvc.setIsEnabled( _data.runProperty.acp0EnableRun, activeEditHandler.editInProgress() );


        dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0Run.dbValue;
    uwPropertySvc.setValue( _data.runProperty.acp0Run,  dbValue );
    uwPropertySvc.setIsEditable( _data.runProperty.acp0Run, true );
    uwPropertySvc.setIsEnabled( _data.runProperty.acp0Run, activeEditHandler.editInProgress() );

    dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0MiddleThird.dbValue;
    uwPropertySvc.setValue( _data.ruleProperties.acp0MiddleThird,  dbValue );
    uwPropertySvc.setIsEditable( _data.ruleProperties.acp0MiddleThird, true );
    uwPropertySvc.setIsEnabled( _data.ruleProperties.acp0MiddleThird, activeEditHandler.editInProgress() );

        dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0LessThanPercentage.dbValue;
    uwPropertySvc.setValue( _data.ruleProperties.acp0LessThanPercentage,  dbValue );
    uwPropertySvc.setIsEditable( _data.ruleProperties.acp0LessThanPercentage, true );
    uwPropertySvc.setIsEnabled( _data.ruleProperties.acp0LessThanPercentage, activeEditHandler.editInProgress() );

        dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0MoreThanPercentage.dbValue;
    uwPropertySvc.setValue( _data.ruleProperties.acp0MoreThanPercentage,  dbValue );
    uwPropertySvc.setIsEditable( _data.ruleProperties.acp0MoreThanPercentage, true );
    uwPropertySvc.setIsEnabled( _data.ruleProperties.acp0MoreThanPercentage, activeEditHandler.editInProgress() );

        dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0SamplesSize.dbValue;
    uwPropertySvc.setValue( _data.ruleProperties.acp0SamplesSize,  dbValue );
    uwPropertySvc.setIsEditable( _data.ruleProperties.acp0SamplesSize, true );
    uwPropertySvc.setIsEnabled( _data.ruleProperties.acp0SamplesSize, activeEditHandler.editInProgress() );

        dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0ControlLimits.dbValue;
    dbValue = _.isString( dbValue ) ? isPropertyValueTrue( dbValue ) : dbValue;
    uwPropertySvc.setValue( _data.ruleProperties.acp0ControlLimits,  dbValue );
    uwPropertySvc.setIsEditable( _data.ruleProperties.acp0ControlLimits, true );
    uwPropertySvc.setIsEnabled( _data.ruleProperties.acp0ControlLimits, activeEditHandler.editInProgress() );

        dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WarningLimits.dbValue;
    dbValue = _.isString( dbValue ) ? isPropertyValueTrue( dbValue ) : dbValue;
    uwPropertySvc.setValue( _data.ruleProperties.acp0WarningLimits,  dbValue );
    uwPropertySvc.setIsEditable( _data.ruleProperties.acp0WarningLimits, true );
    uwPropertySvc.setIsEnabled( _data.ruleProperties.acp0WarningLimits, activeEditHandler.editInProgress() );

        dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0SpecificationLimits.dbValue;
    dbValue = _.isString( dbValue ) ? isPropertyValueTrue( dbValue ) : dbValue;
    uwPropertySvc.setValue( _data.ruleProperties.acp0SpecificationLimits,  dbValue );
    uwPropertySvc.setIsEditable( _data.ruleProperties.acp0SpecificationLimits, true );
    uwPropertySvc.setIsEnabled( _data.ruleProperties.acp0SpecificationLimits, activeEditHandler.editInProgress() );

    for( var i = 0; i < 10; i++ ) {
        dbValue = appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue.length > i ? appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue[i] : false;
        dbValue = _.isString( dbValue ) ? isPropertyValueTrue( dbValue ) : dbValue;
        uwPropertySvc.setValue( _data.ruleProperties['acp0westingRule_' + ( 1 + i )],  dbValue );
        uwPropertySvc.setIsEditable( _data.ruleProperties['acp0westingRule_' + ( 1 + i )], true );
        uwPropertySvc.setIsEnabled( _data.ruleProperties['acp0westingRule_' + ( 1 + i )], activeEditHandler.editInProgress() );
        }
    }
};
/**
 * @param {String} stringValue -
 *
 * @return {boolean} TRUE if given value is not NULL and equals 'true', 'TRUE' or '1'.
 */
export let isPropertyValueTrue = function( stringValue ) {
    return stringValue && stringValue !== '0' &&
        ( String( stringValue ).toUpperCase() === 'TRUE' || stringValue === '1' );
};
var saveHandler = {};

/**
 * Get save handler.
 *
 * @return Save Handler
 */
export let getSaveHandler = function() {
    return saveHandler;
};

/**
 * custom save handler save edits called by framework
 *
 * @return promise
 */
saveHandler.saveEdits = function( dataSource ) {
    //Checking for reset of custom rule prop values are required to reset or not.
    if( appCtxSvc.ctx.xrtPageContext.secondaryXrtPageID === 'tc_xrt_SPCRule' || appCtxSvc.ctx.xrtPageContext.primaryXrtPageID === 'tc_xrt_SPCRule' ) {
        var checkForReset = !( appCtxSvc.ctx.xrtSummaryContextObject.props.acp0CharacteristicsType.dbValue === 'Variable' && appCtxSvc.ctx.xrtSummaryContextObject.props.acp0IndustryRule.dbValue === 'Custom' );
        if ( !checkForReset ) {
            if ( isRulePropertiesModified() ) {
                if ( !appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.newValue ) {
                    appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.newValue = [];
                }
                if ( !appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue ) {
                    appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue = [];
                }
                for ( var i = 0; i < 10; i++ ) {
                    var key = 'acp0westingRule_' + ( 1 + i );
                    var vmProp = appCtxSvc.ctx.xrtSummaryContextObject.ruleProperties[ key ];
                    appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.valueUpdated = true;
                    appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue[ i ] = vmProp.dbValue;
                    appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.newValue[ i ] = vmProp.dbValue;
                }
            }
        } else {
            resetCustomRuleValuesToDefault( dataSource );
        }
    }
    // Get all properties that are modified
    var modifiedViewModelProperties = dataSource.getAllModifiedProperties();
    var modifiedPropsMap = dataSource.getModifiedPropertiesMap( modifiedViewModelProperties );

    // Prepare the SOA input
    var inputs = [];
    _.forEach( modifiedPropsMap, function( modifiedObj ) {
        var modelObject;
        var viewModelObject = modifiedObj.viewModelObject;
        if( viewModelObject && viewModelObject.uid ) {
            modelObject = cdm.getObject( viewModelObject.uid );
        }

        if( !modelObject ) {
            modelObject = {
                uid: cdm.NULL_UID,
                type: 'unknownType'
            };
        }

        var viewModelProps = modifiedObj.viewModelProps;
        var input = dms.getSaveViewModelEditAndSubmitToWorkflowInput( modelObject );
        _.forEach( viewModelProps, function( props ) {
            dms.pushViewModelProperty( input, props );
        } );
        inputs.push( input );
    } );
    var deferred = AwPromiseService.instance.defer();
    if( inputs.length > 0 ) {
        // Call SOA to save the modified data
        dms.saveViewModelEditAndSubmitWorkflow( inputs ).then( function( response ) {
            deferred.resolve();
        }, function( err ) {
            deferred.reject();
        } );
    } else {
        deferred.resolve();
    }
    return deferred.promise;
};

export let resetCustomRuleValuesToDefault = function( dataSource ) {
    // check wether the values are default
    var propertiesToReset =  [ 'acp0Trend', 'acp0Run', 'acp0LessThanPercentage', 'acp0MoreThanPercentage', 'acp0SamplesSize', 'acp0ControlLimits', 'acp0WarningLimits', 'acp0SpecificationLimits', 'acp0MiddleThird', 'acp0EnableRun', 'acp0EnableTrend' ];
    for( var index in propertiesToReset ) {
        var propName = propertiesToReset[ index ];
        var propDbValue = appCtxSvc.ctx.xrtSummaryContextObject.props[propName].dbValue;
        var propDefaultVal = appCtxSvc.ctx.xrtSummaryContextObject.props[propName].value;
        propDefaultVal = propDefaultVal ? propDefaultVal : false;
        if( propDbValue !== propDefaultVal ) {
            appCtxSvc.ctx.xrtSummaryContextObject.props[propName].valueUpdated = true;
            appCtxSvc.ctx.xrtSummaryContextObject.props[propName].dbValue = propDefaultVal;
        }
    }
    var acp0WestinghousRules =   appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules;
    if ( !appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.newValue ) {
        appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.newValue = [];
    }
    if ( !appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue ) {
        appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue = [];
    }
    for ( var i = 0; i < acp0WestinghousRules.dbValue.length; i++ ) {
        if( appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue[i] !== false ) {
            appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.valueUpdated = true;
            appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValue[ i ] = false;
            appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.dbValues[i] = false;
            appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.newValue[ i ] = false;
        }
    }
};

/**
 * Call save edit soa
 *@param {deferred} deferred
 * @return  {promise} promise when all modified Function Specification properties get saved
 */
export let callSaveEditSoa = function( input ) {
    return soaSvc.post( 'Internal-AWS2-2018-05-DataManagement', 'saveViewModelEditAndSubmitWorkflow2', input ).then(
        function( response ) {
            return response;
        },
        function( error ) {
            var errMessage = messagingService.getSOAErrorMessage( error );
            messagingService.showError( errMessage );
            throw error;
        }
    );
};

/**
 * Returns dirty bit.
 * @returns {Boolean} isDirty bit
 */
saveHandler.isDirty = function( dataSource ) {
    var modifiedPropCount = dataSource.getAllModifiedProperties().length;

    if( modifiedPropCount === 0 ) {
        var verdit = exports.hasPropertiesChangedfromorginalProp();
        return verdit;
    }
        return true;
};

export let hasPropertiesChangedfromorginalProp = function() {
    for( var i = 0; i < 10; i++ ) {
        var key = 'acp0westingRule_' + ( 1 + i );
        var vmProp = undefined;
        if( _data !== null && _data !== undefined ) {
            vmProp = _data.ruleProperties[key];
        }
        if( vmProp !== undefined && appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules !== undefined && //
            appCtxSvc.ctx.xrtSummaryContextObject.props.acp0WestinghousRules.displayValues[i] !== vmProp.displayValues ) {
            return true;
        }
    }
    return false;
};

export let isRulePropertiesModified = function() {
    if( appCtxSvc.ctx.xrtSummaryContextObject.ruleProperties ) {
        var modifiedPropCount = 0;
        _.forEach(  _data.ruleProperties, function( prop ) {
            if( prop.valueUpdated || prop.displayValueUpdated ) {
                modifiedPropCount++;
            }
        } );

        if( modifiedPropCount === 0 ) {
            return false;
        }
            return true;
    }
    return false;
};

export default exports = {
    getIndustryRuleName,
    processStandardIndustryRules,
    loadMainRulesPanelData,
    populatePanelData,
    processEditData,
    initaliseValues,
    isPropertyValueTrue,
    getSaveHandler,
    resetCustomRuleValuesToDefault,
    callSaveEditSoa,
    hasPropertiesChangedfromorginalProp,
    isRulePropertiesModified
};
/**
 *
 * @memberof NgServices
 * @member Acp0IndustryRuleService
 */
app.factory( 'Acp0IndustryRuleService', () => exports );

/**
 * Since this module can be loaded as a dependent DUI module we need to return an object indicating which service
 * should be injected to provide the API for this module.
 */
export let moduleServiceNameToInject = 'Acp0IndustryRuleService';
