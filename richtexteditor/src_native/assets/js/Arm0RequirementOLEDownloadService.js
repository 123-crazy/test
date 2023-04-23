// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 */

/**
 * Module for the Requirement Preview Page in ACE
 *
 * @module js/Arm0RequirementOLEDownloadService
 */

import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import reqACEUtils from 'js/requirementsACEUtils';
import reqUtils from 'js/requirementsUtils';
import dmSvc from 'soa/dataManagementService';
import propPolicySvc from 'soa/kernel/propertyPolicyService';
import _ from 'lodash';
import eventBus from 'js/eventBus';

var exports = {};

/**
 * set OLE object to download
 *
 * @param {Object} data - The panel's view model object
 */
export let setOLEObjectToDownload = function( data ) {
    data.oleObjsToDownload = [];

    if( data.response && data.response.modelObjects ) {
        var modelObj = reqACEUtils.getObjectOfType( data.response.modelObjects, 'ImanFile' );

        if( modelObj !== null ) {
            data.oleObjsToDownload = [ modelObj ];
        }
    }
};

/**
 * OLE object click listener
 *
 * @param {Object} targetElement The target element which generates an event
 * @param {Object} data - The View model object
 */
export let handleOLEClick = function( targetElement, data ) {
    var oleID = targetElement.getAttribute( 'oleid' );
    var oleObjectUID = targetElement.getAttribute( 'oleObjectUID' );
    if( oleID ) {
        // Get requirement element uid from requirement div
        var requirementNode = getRequirementElement( targetElement );

        if( requirementNode && requirementNode.id ) {
            var idAceElement = requirementNode.id;
            dmSvc.getProperties( [ idAceElement ], [ 'awb0UnderlyingObject' ] ).then( function() {
                var eleObject = cdm.getObject( idAceElement );
                var policy = {
                    types: [ {
                        name: 'Dataset',
                        properties: [ {
                                name: 'object_name'
                            },

                            {
                                name: 'ref_list',
                                modifiers: [ {
                                    name: 'withProperties',
                                    Value: 'true'
                                } ]
                            }
                        ]
                    } ]
                };

                var revObj = reqACEUtils.getRevisionObject( eleObject );
                var policyId = propPolicySvc.register( policy );
                dmSvc.getProperties( [ revObj.uid ], [ 'IMAN_specification' ] ).then( function( response ) {
                    if( policyId ) {
                        propPolicySvc.unregister( policyId );
                    }
                    // Get FullText object from IMAN_specification prop
                    var fullTextObj = undefined;
                    var rev = cdm.getObject( revObj.uid );
                    var imanSpecificationsProp = rev.props.IMAN_specification;
                    if( imanSpecificationsProp && imanSpecificationsProp.dbValues ) {
                        var imanSpecifications = imanSpecificationsProp.dbValues;
                        for( var i = 0; i < imanSpecifications.length; i++ ) {
                            var imanUid = imanSpecifications[ i ];
                            var imanObj = cdm.getObject( imanUid );
                            if( imanObj && imanObj.type === 'FullText' ) {
                                fullTextObj = imanObj;
                                break;
                            }
                        }
                    }

                    if( fullTextObj ) {
                        var imanID = reqUtils.getFullTextRefObj( fullTextObj, oleID );

                        if( imanID ) {
                            data.oleObjsToDownload = [ {
                                uid: imanID,
                                type: 'ImanFile'
                            } ];

                            eventBus.publish( 'requirementDocumentation.downloadOLEObject' );
                        } else {
                            data.oleObjectDS = [ {
                                uid: oleObjectUID,
                                type: 'unknownType'
                            } ];

                            eventBus.publish( 'requirementDocumentation.downloadOLEObjectFromDataSet' );
                        }
                    }
                } );
            } );
        }
    }
};

/**
 * OLE object click listener
 *
 * @param {Object} targetElement The target element which generates an event
 * @param {Object} data - The View model object
 */
export let handleOLEClickInHomeCKeditor = function( data ) {
    data.oleObjsToDownload = null;
    data.oleObjectDS = null;

    if( data.eventData && data.eventData.targetElement ) {
        var oleID = data.eventData.targetElement.getAttribute( 'oleid' );
        var oleObjectUID = data.eventData.targetElement.getAttribute( 'oleObjectUID' );

        if( oleID ) {
            var fullTextObject = data.fullTextObject;
            var imanID = reqUtils.getFullTextRefObj( fullTextObject, oleID );

            if( imanID ) {
                data.oleObjsToDownload = [ {
                    uid: imanID,
                    type: 'ImanFile'
                } ];
            } else {
                data.oleObjectDS = [ {
                    uid: oleObjectUID,
                    type: 'unknownType'
                } ];
            }
        }
    }
};

/**
 * Gets the dom requirement element closest to the 'node'
 *
 * @param {Object} node - dom element object
 * @returns {Object} Element 'undefined' if not found.
 */
function getRequirementElement( node ) {
    if( !node ) {
        return undefined;
    }
    if( isRequirmentElement( node ) ) {
        return node;
    }

    return getRequirementElement( node.parentNode );
}

/**
 * Checks whether the `node` is a requirement div or not
 *
 * @param {CKEDITOR.dom.node} node node         *
 * @returns {Boolean} element present or not
 */
function isRequirmentElement( node ) {
    return node.classList.contains( 'requirement' );
}

export default exports = {
    setOLEObjectToDownload,
    handleOLEClick,
    handleOLEClickInHomeCKeditor
};
/**
 * This is Custom Preview for Requirement Spec Revision.
 *
 * @memberof NgServices
 * @member Arm0RequirementOLEDownloadService
 */
app.factory( 'Arm0RequirementOLEDownloadService', () => exports );
