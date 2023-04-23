// @<COPYRIGHT>@
// ==================================================
// Copyright 2017.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 */

/**
 * @module js/Awp0SummaryReportsService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import cdm from 'soa/kernel/clientDataModel';
import reportsPanel from 'js/Awp0InContextReportsService';
import advancedSearchLovService from 'js/advancedSearchLovService';
import viewModelObjectService from 'js/viewModelObjectService';
import appCtxService from 'js/appCtxService';
import tcVmoService from 'js/tcViewModelObjectService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

export let conditionalPanelReveal = function( selectedReportDefinitionObject, data ) {
    if( selectedReportDefinitionObject && selectedReportDefinitionObject.props === undefined ) { return; }

    if( selectedReportDefinitionObject !== null && data._internal.panelId === 'Awp0ReportsSummary' ) {
        if( Object.keys( selectedReportDefinitionObject.props ).length <= 5 ) {
            cdm.getObject( selectedReportDefinitionObject );
        }

        data.selectedReportDef = selectedReportDefinitionObject;

        if( selectedReportDefinitionObject.props.rd_type.dbValues[ 0 ] === '0' &&
            selectedReportDefinitionObject.props.rd_source.dbValues[ 0 ] !== 'TcRA' ) {
            eventBus.publish( 'initiateCalltoLoadQuerySource', {
                scope: {
                    data: data
                }
            } );
        } else if( selectedReportDefinitionObject.props.rd_type.dbValues[ 0 ] === '2' &&
            selectedReportDefinitionObject.props.rd_source.dbValues[ 0 ] !== 'TcRA' ) {
            reportsPanel.createwidgetsforCustom( selectedReportDefinitionObject, data );
        }

        reportsPanel.setIsRunInBackgroundParameters( selectedReportDefinitionObject, data );

        reportsPanel.displayStylesheet( selectedReportDefinitionObject, data );
        reportsPanel.getLanguageList( selectedReportDefinitionObject, data );
    }
};

export let getImanQueryObject = function( selectedReportDefinitionObject, data ) {
    var deferred = AwPromiseService.instance.defer();

    var query_src_object = {
        uid: '',
        type: 'ImanQuery'
    };
    selectedReportDefinitionObject = data.selectedReportDef;
    if( selectedReportDefinitionObject !== null ) {
        var referenceBO = cdm.getObject( selectedReportDefinitionObject.props.rd_query_source.dbValues[ 0 ] );

        var propNames = [ 'qry_src_tc_qry' ];
        var objs = [ referenceBO ];
        tcVmoService.getViewModelProperties( objs, propNames ).then( function() {
            query_src_object.uid = objs[ 0 ].props.qry_src_tc_qry.dbValues[ 0 ];
            data.query_src_Object = query_src_object;
            deferred.resolve( query_src_object );
        } );
    }

    return deferred.promise;
};

export let getRealProperties = function( modelObject ) {
    var propsInterested = {};
    var propsInterestedOrdered = {};
    var maxAttributeIndex = 0;
    _.forEach( modelObject.props, function( prop ) {
        var displayName = prop.propertyDescriptor.displayName;
        if( displayName && displayName.trim() ) {
            var attributeNameOriginal = prop.propertyDescriptor.name;
            var indexOf_ = attributeNameOriginal.indexOf( '_' );
            //if indexOf_<0, it is not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
            if( indexOf_ >= 0 ) {
                var attributeIndexStr = attributeNameOriginal.substring( 0, indexOf_ );
                try {
                    var attributeIndex = parseInt( attributeIndexStr, 10 );
                    if( !isNaN( attributeIndex ) ) {
                        if( attributeIndex > parseInt( maxAttributeIndex, 10 ) ) {
                            maxAttributeIndex = attributeIndex;
                        }
                        var attributeName = attributeNameOriginal.substring( indexOf_ + 1 );
                        prop.propName = attributeName;
                        //check if LOV
                        if( prop.propertyDescriptor.lovCategory === 1 ) {
                            prop.propertyDescriptor.anArray = true;
                            prop.propertyDescriptor.fieldType = 1;
                            prop.propertyDescriptor.maxArraySize = -1;
                            if( prop.uiValues.length === 1 && prop.uiValues[ 0 ] === '' ) {
                                prop.uiValues = [];
                                prop.dbValues = [];
                            }
                        }
                        propsInterested[ attributeIndex ] = prop;
                    }
                } catch ( e ) {
                    //not an attribute interested in, e.g., an attribute inherited from the parent which is not a query clause
                }
            }
        }
    } );
    //Date query critiera attribute should always show time, it doesn't honor Fnd0EnableTimeForDateProperty property constant
    //Since there is no information about timeEnabled from query criteria property descript constant map, add timeEnable=1 to
    //always show time widget in advanced search page.
    _.forEach( propsInterested, function( property ) {
        if( property ) {
            var propDesc = property.propertyDescriptor;
            var constantsMap;
            if( propDesc && propDesc.valueType === 2 ) {
                constantsMap = propDesc.constantsMap;
            }
            if ( constantsMap ) {
                if ( _.isUndefined( constantsMap.timeEnabled ) ) {
                    constantsMap.timeEnabled = '1';
                }
            }
        }
    } );
    //return the props in ordered list
    for( var i = 0; i <= maxAttributeIndex; i++ ) {
        var prop = propsInterested[ i ];
        if( prop ) {
            propsInterestedOrdered[ prop.propName ] = prop;
        }
    }
    return propsInterestedOrdered;
};

export let createSummaryReportWidgets = function( data ) {
    var modelObject = cdm.getObject( data.queryCriteriaUid );

    var modelObjectForDisplay = {
        uid: data.query_src_Object.uid,
        props: exports.getRealProperties( modelObject ),
        type: 'ImanQuery',
        modelType: modelObject.modelType
    };

    var savedQueryViewModelObj = viewModelObjectService.constructViewModelObjectFromModelObject(
        modelObjectForDisplay, 'Search' );

    _.forEach( savedQueryViewModelObj.props, function( prop ) {
        if( prop.lovApi ) {
            advancedSearchLovService.initNativeCellLovApi( prop, null, 'Search', savedQueryViewModelObj );
        }
    } );

    data.clausesfiltersList = savedQueryViewModelObj.props;
    appCtxService.updatePartialCtx( 'awp0SummaryReports.clausesfiltersList', data.clausesfiltersList );
};

/**
 * set the pin on the data
 *
 * @return {Object} the model object
 */
export let setPinnedToForm = function( pinnedToForm, unpinnedToForm ) {
    pinnedToForm.dbValue = false;
    unpinnedToForm.dbValue = true;
};

/**
 * set unpin on the data
 *
 * @return {Object} the model object
 */
export let setUnPinnedToForm = function( pinnedToForm, unpinnedToForm ) {
    pinnedToForm.dbValue = true;
    unpinnedToForm.dbValue = false;
};

export default exports = {
    conditionalPanelReveal,
    getImanQueryObject,
    getRealProperties,
    createSummaryReportWidgets,
    setPinnedToForm,
    setUnPinnedToForm
};
/**
 * Reports panel service utility
 *
 * @memberof NgServices
 * @member summaryreportsPanelService
 */
app.factory( 'summaryreportsPanelService', () => exports );
