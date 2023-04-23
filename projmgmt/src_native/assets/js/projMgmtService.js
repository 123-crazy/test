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
 * @module js/projMgmtService
 */
import app from 'app';
import uwPropSvc from 'js/uwPropertyService';
import localStrg from 'js/localStorage';
import _t from 'js/splmTableNative';
import localeService from 'js/localeService';
import appCtxService from 'js/appCtxService';
import cmm from 'soa/kernel/clientMetaModel';
import eventBus from 'js/eventBus';
import ngModule from 'angular';
import _ from 'lodash';

var exports = {};

var _columnDefns = [];
var _isFilterSet = false;
var localTextBundle;
const PROJECT_SESSION_OUT_LISTENER = 'projectSessionOutListener';
/**
 * Load the column configuration
 *
 * @param {Object} dataprovider - the data provider
 *
 */
function initColumns() {
    var projMgmtTextBundle = _getLocalTextBundle();
    _columnDefns = [ {
        "name": "icon",
        "displayName": "",
        "maxWidth": 30,
        "minWidth": 30,
        "width": 30,
        "enableColumnMenu": false,
        "pinnedLeft": true
    }, {
        "propertyName": "object_string",
        "typeName": "TC_Project",
        "isTableCommand": true,
        "modifiable": false
    }, {
        "propertyName": "object_name",
        "typeName": "TC_Project"
    }, {
        "propertyName": "project_id",
        "typeName": "TC_Project"
    }, {
        "propertyName": "fnd0ProjectCategory",
        "typeName": "TC_Project"
    }, {
        "propertyName": "is_active",
        "typeName": "TC_Project"
    },{
        "propertyName": "use_program_security",
        "displayName" : projMgmtTextBundle.useProgramSecurity,
        "typeName": "TC_Project",
        "renderingHint": "triState",
        "cellRenderers":[securityCellRenderer()]
    }, {
        "propertyName": "owning_user",
        "typeName": "WorkspaceObject"
    }
    ];
}

/**
 * Show use_program_security boolean property as listbox.
 */
let securityCellRenderer = () => {
    return {
        action: function( column, vmo ,tableElem, rowElem) {
            // Create root element
            changeUseProgramSecurityDisplay(vmo.props[column.field]);
            const cellContent = _t.Cell.createElement( column, vmo, tableElem, rowElem );
            // Apply onClick listener to handle editing
            cellContent.onclick = function() {
                changeUseProgramSecurityDisplay(vmo.props[column.field]);
            };
            return cellContent;
        },
        condition: function( column ,vmo,tableElem, rowElem) {
            return true;
        }
    };
};
/**
 * Load the column configuration
 *
 * @param {Object} dataprovider - the data provider
 *
 */
export let loadColumns = function( dataprovider ) {
    if( _.isEmpty( _columnDefns ) ) {
        initColumns();
        var type = cmm.getType( "TC_Project" );
        _.forEach( _columnDefns, function( columnDef ) {
            if( type && type.propertyDescriptorsMap[ columnDef.name ] && !columnDef.displayName ) {
                columnDef.displayName = type.propertyDescriptorsMap[ columnDef.name ].displayName;
            }
        } );

    }
    dataprovider.columnConfig = {
        "columns": _columnDefns
    };

    return _columnDefns;
};

export let getSortCriteria = function( sortCriteria ) {

    var criteria = ngModule.copy( sortCriteria );
    if( !_.isEmpty( criteria ) && ( criteria[ 0 ].fieldName.indexOf( '.' ) === -1 ) ) {
        criteria[ 0 ].fieldName = "WorkspaceObject." + criteria[ 0 ].fieldName;
    }

    return criteria;
};


export let updateCriteria = function( searchCriteria ) {
    _isFilterSet = true;
    var searchContext = appCtxService.getCtx( 'search' );
    searchContext.criteria.searchString = searchCriteria;
    appCtxService.updateCtx( 'search', searchContext );
    eventBus.publish( 'myProjectList.loadData' );
};

/**
 * Update data provider with search results
 *
 * @param {Object} data - data
 * @param {Object} dataProvider - data provider
 */
export let updateDataProviders = function( data, dataProvider ) {
    if( _isFilterSet ) {
        _isFilterSet = false;
        dataProvider.update( data.searchResults, data.totalFound );
    }
    if( !appCtxService.getCtx( PROJECT_SESSION_OUT_LISTENER ) ) {
        appCtxService.registerCtx( PROJECT_SESSION_OUT_LISTENER, eventBus.subscribe( 'session.signOut', function() {

                let allLocalStates = localStrg.get( 'awTreeTableState' );
                let allLocalStatesJson = JSON.parse( allLocalStates );
                var projectTeamTableTree = "Aut0ProjectTeamTableTree";

                if(allLocalStatesJson[projectTeamTableTree])
                {
                    delete allLocalStatesJson[ projectTeamTableTree ];
                }
                let stringToPersist = JSON.stringify( allLocalStatesJson );

                localStrg.publish( 'awTreeTableState', stringToPersist );
                let _sessionOutListener = appCtxService.getCtx( PROJECT_SESSION_OUT_LISTENER );
                if( _sessionOutListener ) {
                    eventBus.unsubscribe( _sessionOutListener );
                    appCtxService.unRegisterCtx( PROJECT_SESSION_OUT_LISTENER );
                }
            }
        ) );
    }
};

export let getStartIndex = function( dataProvider ) {
    var startIndex = 0;
    if( !_isFilterSet ) {
        startIndex = dataProvider.startIndex;
    }
    return startIndex;
};

/**
 * gets local text bundle
 * @returns {Object} text bundle
 */
var _getLocalTextBundle = function() {
    if(!localTextBundle)
    {
        var resource = app.getBaseUrlPath() + '/i18n/ProjmgmtConstants.json';
        localTextBundle = localeService.getLoadedText( resource );
    }
    return localTextBundle;
};

/**
 * This method is to render the "Use Program Security" as radio button
 * Security :  O Project    O Program
 *
 * Once saved display as , Security : Project
 *
 * @param {prop} securityProp property from selected object
 */
export let changeUseProgramSecurityDisplay = function(securityProp){
    var localeTextBundle = _getLocalTextBundle();
    securityProp.propertyRadioFalseText = localeTextBundle.projectRadioLabel;
    securityProp.propertyRadioTrueText = localeTextBundle.programRadioLabel;
    uwPropSvc.setPropertyDisplayName(securityProp,localeTextBundle.useProgramSecurity);
    var viewMode = appCtxService.ctx.ViewModeContext.ViewModeContext;
    if (viewMode === 'TableView' || viewMode === 'TableSummaryView')
    {
        uwPropSvc.setPropertyDisplayName(securityProp,"");
    }
    if(securityProp.dbValue)
    {
        securityProp.uiValues = [localeTextBundle.programRadioLabel];
    }
    else if(securityProp.dbValue === false){
        securityProp.uiValues = [localeTextBundle.projectRadioLabel];
    }
    securityProp.uiValue = securityProp.uiValues[0];
};

/**
 * This method will make the Visible property as uneditable if the "active" is true.
 * "Active & Invisible" is not correct option.Restrict the user to save this combination.
 * @param {ctx} ctx appCtxContext object
 */
export let changeActiveVisible = function (ctx)
{
    if(ctx.xrtSummaryContextObject.props.is_active.dbValue)
    {
        uwPropSvc.setValue(ctx.xrtSummaryContextObject.props.is_visible,true);
    }
};

export default exports = {
    loadColumns,
    getSortCriteria,
    updateCriteria,
    updateDataProviders,
    getStartIndex,
    changeActiveVisible,
    changeUseProgramSecurityDisplay
};
app.factory( 'projMgmtService', () => exports );
