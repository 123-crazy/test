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
 * @module js/AddProjectPanel
 */
import app from 'app';
import commandPanelService from 'js/commandPanel.service';
import selectionService from 'js/selection.service';
import appCtxService from 'js/appCtxService';
import soaService from 'soa/kernel/soaService';
import cmm from 'soa/kernel/clientMetaModel';

var exports = {};

export let getAddProjectPanel = function( commandId, location, ctx ) {
    var programPlanningContext = 'programPlanningContext';
    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 || ctx.pselected !== undefined ) {
        var allowedChildTypes = selection[ 0 ].props.prg0AllowedChildTypes.dbValues[ 0 ];
        var indexOfTypeSeparator = allowedChildTypes.indexOf( ',' );
        var planObjType = '';
        if( indexOfTypeSeparator < 0 ) {
            var modelType = cmm.getType( allowedChildTypes );
            if( modelType !== null ) {
                planObjType = modelType.displayName;
            }
        }

        var allowedChildTypesArray = allowedChildTypes.split( ',' );

        var promise = soaService.ensureModelTypesLoaded( allowedChildTypesArray );

        if( promise ) {
            promise.then( function() {
                var parentType = 'Prg0AbsProjectPlan';
                var allowedTypes = [];

                for( var i = 0; i < allowedChildTypesArray.length; i++ ) {
                    var type = cmm.getType( allowedChildTypesArray[ i ] );
                    if( type !== undefined && cmm.isInstanceOf( parentType, type ) ) {
                        allowedTypes.push( allowedChildTypesArray[ i ] );
                    }
                }
                if( ctx.mselected[ 0 ].props.object_type.dbValues[ 0 ] === 'Prg0AbsProgramPlan' ) {
                    allowedTypes.push( 'Prg0ProjectPlan' );
                }
                var showTypes = false;
                var typesToCreate = '';
                if( allowedTypes.length > 1 ) {
                    for( var index = 0; index < allowedTypes.length; index++ ) {
                        typesToCreate += allowedTypes[ index ];
                        typesToCreate += ',';
                    }
                    showTypes = true;
                } else {
                    typesToCreate += allowedTypes[ 0 ];
                }

                var prgPlanningContextObject;
                if( commandId === 'Pgp0AddPlanLevel' ) {
                    prgPlanningContextObject = {
                        TypeTitle: planObjType,
                        PanelTitle: 'Add Plan Level',
                        locationObject: ctx.pselected,
                        type1: typesToCreate,
                        parent: ctx.mselected[ 0 ],
                        showTypes: showTypes,
                        parentName: 'Prg0AbsPlan'
                    };
                }
                appCtxService.registerCtx( programPlanningContext, prgPlanningContextObject );
                commandPanelService.activateCommandPanel( 'Pgp0AddPlanLevel', location, null, true );
            } );
        } else {
            appCtxService.unRegisterCtx( programPlanningContext );
        }
    }
};

export let getAddEventPanelOnEventTab = function( commandId, location, ctx ) {
    var programPlanningContext = 'programPlanningContext';
    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 || ctx.locationContext.modelObject !== undefined ) {
        if( selection[ 0 ].modelType.typeHierarchyArray.indexOf( 'Prg0AbsEvent' ) > -1 ) {
            selection[ 0 ] = ctx.pselected;
        }

        var prgPlanningContextObject = {
            TypeTitle: 'Event',
            PanelTitle: 'Add Event',
            locationObject: ctx.locationContext.modelObject,
            type1: 'Prg0AbsEvent',
            parent: selection[ 0 ],
            showTypes: false,
            parentName: 'Prg0AbsEvent'
        };

        appCtxService.registerCtx( programPlanningContext, prgPlanningContextObject );
        commandPanelService.activateCommandPanel( 'Pgp0AddEvent', location, null, true );
    }
};

export let getAddEventPanel = function( commandId, location, ctx ) {
    var programPlanningContext = 'programPlanningContext';
    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 || ctx.pselected !== undefined ) {
        var prgPlanningContextObject = {
            TypeTitle: 'Event',
            PanelTitle: 'Add Event',
            locationObject: ctx.pselected,
            type1: 'Prg0AbsEvent',
            parent: ctx.mselected[ 0 ],
            showTypes: false,
            parentName: 'Prg0AbsEvent'
        };

        appCtxService.registerCtx( programPlanningContext, prgPlanningContextObject );
        commandPanelService.activateCommandPanel( 'Pgp0AddEvent', location, null, true );
    }
};

export let getAddCriteria = function( commandId, location, ctx ) {
    var programPlanningContext = 'programPlanningContext';
    var selection = selectionService.getSelection().selected;
    var selectedUid = ctx.mselected[ 0 ];
    if( selection && selection.length > 0 || ctx.locationContext.modelObject !== undefined ) {
        var prgPlanningContextObject = {
            TypeTitle: 'Criterion',
            PanelTitle: 'Add Criterion',
            locationObject: ctx.locationContext.modelObject,
            type1: 'Prg0AbsCriteria',
            parent: selectedUid,
            showTypes: false,
            parentName: 'Prg0AbsCriteria'
        };

        appCtxService.registerCtx( programPlanningContext, prgPlanningContextObject );
        commandPanelService.activateCommandPanel( 'Pgp0AddCriteria', location );
    }
};

export let getAddResponsibleUser = function( commandId, location, ctx ) {
    var programPlanningContext = 'programPlanningContext';
    var selection = selectionService.getSelection().selected;

    if( selection && selection.length > 0 || ctx.locationContext.modelObject !== undefined ) {
        var prgPlanningContextObject = {
            TypeTitle: 'Add Responsible User',
            PanelTitle: 'Add Responsible User',
            locationObject: ctx.locationContext.modelObject,
            type1: 'User,Group,Role,POM_member,GroupMember,Person',
            parent: ctx.mselected[ 0 ],
            showTypes: false,
            parentName: 'User'
        };

        appCtxService.registerCtx( programPlanningContext, prgPlanningContextObject );
        commandPanelService.activateCommandPanel( 'Pgp0AddResponsibleUser', location );
    }
};

export default exports = {
    getAddProjectPanel,
    getAddEventPanelOnEventTab,
    getAddEventPanel,
    getAddCriteria,
    getAddResponsibleUser
};
app.factory( 'AddProjectPanel', () => exports );
