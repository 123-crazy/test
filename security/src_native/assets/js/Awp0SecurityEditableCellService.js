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
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Awp0SecurityEditableCellService
 */
import app from 'app';
import _ from 'lodash';
import $ from 'jquery';
import parsingUtils from 'js/parsingUtils';
var exports = {};

/**
 * Initialize the SecurityEditableCell and adds the click listener to the editable prop.
 */
export let initializeSecurityEditableCellClickListener = function( data) {
    data.isProgressEditing = false;
    data.authProps = {
        "dbValues": [ "ead_paragraph" ]
    };

    data.cellEditMode = false;
    data.modifiable = false;
    var editableVmObj1 = parsingUtils.parentGet( data, 'authProps' );

    if( editableVmObj1 ) {
        data.editableProps = editableVmObj1.dbValues;
    }


    data.startCellEdit = function( subPanelContext,event ) {
        if( event ) {
            var editableVmObj = parsingUtils.parentGet(data, 'authProps' );
            data.editableProps = editableVmObj.dbValues;
            if(data.editableProps && !data.isProgressEditing &&
                subPanelContext.modelType.typeHierarchyArray.indexOf( "ITAR_License" ) !== -1 ) {

                event.stopPropagation();

                data.modifiable = true;
                data.cellEditMode = true;
                var body = $('body');
                // trigger click event for stooping the editability of other cell if open
                body.triggerHandler( 'click' );
                for( var i = 0; i < data.editableProps.length; i++ ) {
                    var prop = subPanelContext.props[ data.editableProps[ i ] ];
                    if( prop ) {
                        prop.autofocus = true;
                        prop.isEditable = true;
                        prop.isArray = false;
                        prop.type = 'STRING';
                    }
                }
                data._bodyClickListener = function( event2 ) {
                    exports.stopCellEdit( data,subPanelContext, event2 );
                };
                data.isProgressEditing = true;

                $( 'body' ).off( 'click touchstart', data._bodyClickListener ).on( 'click touchstart',
                    data._bodyClickListener );

            }

        }
    };
};

/**
 *This methods mark the property cell edit to false if click outside the cell.
 * @param {data} data
 * @param {subPanelContext} subPanelContext
 * @param {event} event
 */
export let stopCellEdit = function( data,subPanelContext, event) {
    var target = $( event.target );
    var cell = target.closest( '.aw-widgets-propertyValContainer' );
    if( cell.length === 0 || !cell.scope() || !cell.scope().prop &&
        subPanelContext.modelType.typeHierarchyArray.indexOf( "ITAR_License" ) !== -1 ) {

        data.isProgressEditing = false;
        data.modifiable = false;
        data.cellEditMode = false;
        for( var i = 0; i < data.editableProps.length; i++ ) {
            var prop = subPanelContext.props[ data.editableProps[ i ] ];
            if( prop ) {
                prop.autofocus = false;
                prop.isEditable = false;
            }
        }

        $( 'body' ).off( 'click touchstart', data._bodyClickListener );

        delete data._bodyClickListener;
    }
};

export default exports = {
    initializeSecurityEditableCellClickListener,
    stopCellEdit
};
/**
 * This service creates name value property
 *
 * @memberof NgServices
 * @member Awp0AssignProjects
 */
app.factory( 'Awp0SecurityEditableCellService', () => exports );
