// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/**
 * @module js/Arm0RequirementDocumentationUpdateDataService
 */
import app from 'app';
import appCtxSvc from 'js/appCtxService';
import ckeditorOperations from 'js/ckeditorOperations';
import cdm from 'soa/kernel/clientDataModel';
import _ from 'lodash';
import eventBus from 'js/eventBus';
var exports = {};

/**
 * Function to handle model objects updated event when Documentation tab is opened
 *
 * @param {Object} modelObjects the model object
 * @param {Object} data the view model data
 */
export let modelOnObjectsChanged = function( modelObjects, data ) {
    if( modelObjects ) {
        var uids = modelObjects.map( s=>s.uid );
        var ckeditorModelelements = ckeditorOperations.getCKEditorModelElementsByUIDs( uids );
        if( ckeditorModelelements.length > 0 ) {
            _updateObjectProperties( ckeditorModelelements, data );
        }
    }
};

/**
 * Update the object properties if it's changed
 * @param {Object} ckeditorModelelements nodes
 * @param {Object} data data object
 */
 // eslint-disable-next-line complexity
var _updateObjectProperties = function( ckeditorModelelements, data ) {
    var modelElementsTobeUpdated = [];
    for ( const ckeditorModelEle of ckeditorModelelements ) {
      if( ckeditorModelEle.name !== 'loading' ) {
        const uid = ckeditorOperations.getIdFromCkeModelElement( ckeditorModelEle );
        const modelObject = cdm.getObject( uid );
        if( modelObject.props.awb0UnderlyingObject ) {
            var props = ckeditorOperations.getPropertiesFromEditor( ckeditorModelEle );
            var underlyingObject = modelObject.props.awb0UnderlyingObject.dbValues[ 0 ];
            var underlyingModelObject = cdm.getObject( underlyingObject );
            var properties = {};
            var isReloadRequired = false;
            for ( const prop of props ) {
                if( prop ) {
                    if( prop.name === 'revisionid' && underlyingObject !== prop.value ) {
                        isReloadRequired = true;
                        break;
                    }
                    if( underlyingModelObject && underlyingModelObject.props[ prop.name ] && !( _.isEmpty( underlyingModelObject.props[ prop.name ].dbValues[ 0 ] ) && _.isEmpty( prop.value ) ) &&
                        _trimContent( underlyingModelObject.props[ prop.name ].dbValues[ 0 ] ) !== _trimContent( _.escape( prop.value ) ) ) {
                        properties[ prop.name ] = underlyingModelObject.props[ prop.name ].dbValues[ 0 ];
                    }

                    if( prop.name === 'arm1ParaNumber' && modelObject.props.arm1ParaNumber && modelObject.props.arm1ParaNumber.dbValues[0] !== prop.value ) {
                        properties.requirementNamePrefix = modelObject.props.arm1ParaNumber.dbValues[0] + ' ' + props[2].value;
                    }

                    if( prop.name === 'object_name' && modelObject.props.object_name && modelObject.props.object_name.dbValues[0] !== _.escape( prop.value ) ) {
                        properties.object_name = modelObject.props.object_name.dbValues[0];
                    }
                }
            }
            if( isReloadRequired ) {
                eventBus.publish( 'requirementDocumentation.refreshDocumentationTab' );
                break;
            }

            if( underlyingModelObject && underlyingModelObject.props.date_released && underlyingModelObject.props.date_released.dbValues.length > 0
                && underlyingModelObject.props.date_released.dbValues[0] !== null ) {
                properties.date_released = underlyingModelObject.props.date_released.dbValues[ 0 ];
            }

            if( Object.keys( properties ).length > 0 ) {
                modelElementsTobeUpdated.push( {
                    item: ckeditorModelEle,
                    props: properties
                } );
            }
        }
     }
    }
    if( modelElementsTobeUpdated.length > 0 ) {
        ckeditorOperations.updateObjectProperties( data.editorProps.id, modelElementsTobeUpdated, data );
    }
};

 /**
 * Update Paragraph number property in editor
 * @param {Map} objectUidsWithPropValueMap - map of object uid and para number
 */
  export let updateParaNumberPropInEditor = function( objectUidsWithPropValueMap ) {
    var uids = Array.from( objectUidsWithPropValueMap.keys() );
    var ckeditorModelelements = ckeditorOperations.getCKEditorModelElementsByUIDs( uids );
    var reqpropsToBeUpdated = [];
    for ( const ckeditorModelEle of ckeditorModelelements ) {
      if( ckeditorModelEle.name !== 'loading' ) {
        const uid = ckeditorOperations.getIdFromCkeModelElement( ckeditorModelEle );
        var propData = ckeditorOperations.getElementForUpdatedParaNumberProp( ckeditorModelEle, objectUidsWithPropValueMap.get( uid ) );
        if( propData ) {
            reqpropsToBeUpdated.push( propData );
        }
      }
    }
    if( reqpropsToBeUpdated.length > 0 ) {
        ckeditorOperations.updateAttributesInBulk( reqpropsToBeUpdated );
    }
};

/**
 * @param {String} content  - string value
 * @returns {String} return contents after trim
 */
var _trimContent = function( content ) {
    if( content ) {
        return content.trim();
    }
    return content;
};

/**
 * Service for Arm0RequirementDocumentationUpdateDataService.
 *
 * @member Arm0RequirementDocumentationUpdateDataService
 */

export default exports = {
    modelOnObjectsChanged,
    updateParaNumberPropInEditor
};
app.factory( 'Arm0RequirementDocumentationUpdateDataService', () => exports );
