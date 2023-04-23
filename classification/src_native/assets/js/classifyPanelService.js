/* eslint-disable max-lines */
/* eslint-disable no-bitwise */
// Copyright 2018 Siemens Product Lifecycle Management Software Inc.
/*global
 define
 */

/**
 * This is a utility to format the response of the getAttributes2 classification SOA to be compatible with the generic
 * property widgets.
 *
 * @module js/classifyPanelService
 */
import app from 'app';
import uwPropertyService from 'js/uwPropertyService';
import soaService from 'soa/kernel/soaService';
import TcServerVersion from 'js/TcServerVersion';
import messagingService from 'js/messagingService';
import iconSvc from 'js/iconService';
import classifySvc from 'js/classifyService';
import classifyUtils from 'js/classifyUtils';
import appCtxSvc from 'js/appCtxService';
import _ from 'lodash';
import eventBus from 'js/eventBus';
import logger from 'js/logger';
import fmsUtils from 'js/fmsUtils';
import browserUtils from 'js/browserUtils';
import analyticsSvc from 'js/analyticsService';
import AwPromiseService from 'js/awPromiseService';

import 'js/classifyLOVService';

import 'js/modelPropertyService';
import 'js/dateTimeService';

var exports = {};

//Convert values always gets called twice on starting an edit operation, thus the count needs to be kept to ensure it is only call
//at the right time.
var initialConvertCount = 2;

/**
 * Sets value on a given property
 *
 * @param {Object} properties - array of properties
 * @param {Object} propertyId - property id
 * @param {Object} values - values to set on property
 *
 * @returns {Object} updates property array
 */
var setPropertyValue = function( properties, propertyId, values ) {
    _.forEach( properties, function( prop ) {
        if( prop.propertyId === propertyId ) {
            _.forEach( values, function( value, ind ) {
                prop.values[ ind ].displayValue = value;
            } );
        }
    } );
    return properties;
};

/**
 * Update attribute value
 *
 * @param {Object} properties - array of properties
 * @param {Object} attribute - attribute definition
 *
 * @returns {Object} updates property array
 */
var updateAttributeValue = function( properties, attribute ) {
    var unitSystem = classifySvc.getPropertyValue( properties, classifySvc.UNCT_CLASS_UNIT_SYSTEM );
    var currentUnitSystem = unitSystem === 'metric' ? attribute.metricFormat : attribute.nonMetricFormat;
    if( classifyUtils.typeEnumMap[ currentUnitSystem.formatDefinition.formatType ] === 'BOOLEAN' ) {
        var tempAttrVals = classifyUtils.getAttributeValues( attribute.id, properties );
        var dbValue = classifyUtils.formatAttributeValue( tempAttrVals, currentUnitSystem );
        if( dbValue && !_.isEmpty( dbValue ) ) {
            return setPropertyValue( properties, attribute.attributeId, dbValue );
        }
    }

    if( currentUnitSystem.formatDefinition.formatType === -1 ) {
        var tempVar = classifyUtils.getAttributeValues( attribute.attributeId, properties );
        var tempAttrID = attribute.attributeId.substring( 0, 4 ) === 'sml0' ? attribute.attributeId.substring( 4 ) : attribute.attributeId;
        var keyLovDesc = appCtxSvc.ctx.ICO_response.keyLOVDescriptors;

        if( keyLovDesc && keyLovDesc[ tempAttrID ] ) {
            setKeyLovPropertyValue( attribute, tempVar, currentUnitSystem, keyLovDesc[ tempAttrID ].keyLOVEntries, keyLovDesc[ tempAttrID ].keyLOVOptions, properties );
        } else {
            setKeyLovPropertyValue( attribute, tempVar, currentUnitSystem, attribute.attributeKeyLOVDef.keyLOVEntries, null, properties );
        }
    }
    return properties;
};

var setKeyLovPropertyValue = function( attribute, attrVals, currentUnitSystem, keyLOVEntries, keyLOVOptions, properties ) {
    var keyLovList = [];
    for( var k = 0; k < attrVals.length; k++ ) {
        for( var j = 0; j < keyLOVEntries.length; j++ ) {
            if( keyLOVEntries[ j ].keyLOVkey === attrVals[ k ].internalValue ) {
                keyLovList.push( currentUnitSystem.formatDefinition.formatLength === -200103 || keyLOVOptions === null || keyLOVOptions === 1 ? keyLOVEntries[ j ].keyLOVValue :  keyLOVEntries[ j ].keyLOVkey + ' ' + keyLOVEntries[ j ].keyLOVValue );
                break;
            }
        }
    }
    setPropertyValue( properties, attribute.attributeId, keyLovList );
};

/**
 * Fires the event to navigate to the 'Create' classification sub-panel
 *
 * @param {Object} data - The viewmodel's data object.
 */
export let setCreateMode = function( data ) {
    //Unset Advanced Data flag to ensure it is set correctly
    data.advancedData = false;

    data.isEditMode = false;
    initialConvertCount = 2;
    var context = {
        destPanelId: 'Awp0CreateClassificationSub',
        recreatePanel: true,
        supportGoBack: false
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Fires the event to navigate to the 'Create' classification sub-panel for standalone case
 * @param {Object} data - The viewmodel's data object.
 */
export let setCreateModeForStandalone = function( data ) {
    initialConvertCount = 2;

    data.activeView = 'Awp0CreateClassificationSub';

    data.createForStandalone = true;

    var context = {
        destPanelId: 'Awp0CreateClassificationSub',
        recreatePanel: true,
        supportGoBack: false
    };
    eventBus.publish( 'awPanel.navigate', context );
};

/**
 * Following functions sets up the standalone data required for standalone use cases
 * @param {*} data The declarative view model
 */
export let setupStandaloneData = function( data ) {
    data.standaloneIco = appCtxSvc.getCtx( 'standaloneIco' );
    data.clsClassDescriptors = appCtxSvc.getCtx( 'clsClassDescriptors' );
    var classId = classifySvc.getPropertyValue( data.standaloneIco.properties, classifySvc.UNCT_CLASS_ID );

    //response.clsDefMap[classId].properties, UNCT_CLASS_NAME
    // The vars required in editMode
    data.selectedCell = {
        icoUid: data.standaloneIco.clsObject.uid,
        cellInternalHeader1: classId,
        cellHeader: classifySvc.getPropertyValue(
            data.clsClassDescriptors[ classId ].properties, classifySvc.UNCT_CLASS_NAME )
    };

    data.selectedClass = {
        id: data.selectedCell.cellInternalHeader1,
        className: data.selectedCell.cellHeader1
    };

    // The vars required in editMode method to distinguish between
    // 'regular' edit and 'standalone' edit
    data.standaloneObjectExists = true;
    data.clsObjTag = data.standaloneIco.clsObject;
    exports.editMode( data, appCtxSvc.getCtx( 'selected' ) );
};

/*
 * Generates the cells to be displayed in 'View' mode
 *
 * @param {Object} response - the SOA response
 * @returns cells
 */
export let generateCells = function( response ) {
    var cells = [];

    appCtxSvc.registerCtx( 'ICO_response', response );

    if( response && response.clsObjectDefs && !_.isEmpty( response ) ) {
        if( !_.isEmpty( response.clsObjectDefs[ 1 ][ 0 ] ) ) {
            if( !_.isEmpty( response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ] ) ) {
                if( !_.isEmpty( response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].workspaceObject ) ) {
                    if( response.clsObjectDefs[ 1 ][ 0 ] && response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ] && response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].workspaceObject ) {
                        if( response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].workspaceObject.uid === 'AAAAAAAAAAAAAA' ) {
                            //Standalone ICO exists; pop up connect message

                            appCtxSvc.registerCtx( 'standaloneIco', response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ] );
                            appCtxSvc.registerCtx( 'clsClassDescriptors', response.clsClassDescriptors );

                            appCtxSvc.registerCtx( 'standaloneExists', true );
                        }
                    }
                }
            }
        }

        var classDefResponse = response.clsClassDescriptors;

        _.forEach( response.clsObjectDefs[ 1 ][ 0 ].clsObjects, function( clsObj ) {
            var classId = classifySvc.getPropertyValue( clsObj.properties, classifySvc.UNCT_CLASS_ID );

            var attributesDefinitions = classDefResponse[ classId ].attributes;

            _.forEach( attributesDefinitions, function( attributesDefinition ) {
                var attribute = attributesDefinition;
                updateAttributeValue( clsObj.properties, attribute );
                //annotation for display alongside with attribute value.
                var annotation = classifySvc.getAnnotations( attributesDefinition );
            } );
            var parents = classifySvc.getParentsPath( response.classParents[ classId ].parents );
            var currentClassName = classifySvc.getPropertyValue( classDefResponse[ classId ].properties, classifySvc.UNCT_CLASS_NAME );

            var iconAvailable = false;
            var iconPosition = -1;
            var ticket = {};
            if( classDefResponse && classDefResponse[ classId ] && classDefResponse[ classId ].documents ) {
                var documents = classDefResponse[ classId ].documents;
                var iconindex = 0;
                _.forEach( documents, function( document ) {
                    if( document.documentType === 'icon' ) {
                        iconPosition = iconindex;
                    }
                    iconindex++;
                } );
            }
            if( iconPosition !== -1 ) {
                ticket = classDefResponse[ classId ].documents[ iconPosition ].ticket;
            } else {
                // Get the class icon for the ICO's class.
                if( classDefResponse && classDefResponse[ classId ] && classDefResponse[ classId ].documents &&
                    classDefResponse[ classId ].documents[ 0 ] ) {
                    ticket = classDefResponse[ classId ].documents[ 0 ].ticket;
                }
            }

            if( ticket && classifyUtils.isSupportedImageType( ticket ) ) {
                iconAvailable = true;
            }

            if( iconAvailable === true ) {
                var imageIconUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' +
                    fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
            } else {
                // If the class doesn't have an image, then display the 'default' icon.
                // Since we are not a real VMO, we can't use the type icon mechanism directly.
                var classifyIconName = 'typeClassificationElement48.svg';
                imageIconUrl = iconSvc.getTypeIconFileUrl( classifyIconName );
            }

            var lastModifiedDate = classifySvc.getPropertyValue( clsObj.properties, classifySvc.UNCT_MODIFY_DATE );
            if( lastModifiedDate ) {
                lastModifiedDate = classifyUtils.convertClsDateToAWTileDateFormat( lastModifiedDate );
            }
            var cell = {};
            cell.cellHeader1 = currentClassName;
            cell.cellInternalHeader1 = classId;

            cell.typeIconFileUrl = [];
            if( imageIconUrl ) {
                // cell.typeIconFileUrl.push( imageIconUrl );
                cell.thumbnailURL = imageIconUrl;
                cell.hasThumbnail = true;
            }
            //add classname in path separately to make it bold on tooltip
            if( lastModifiedDate && parents ) {
                cell.cellExtendedTooltipProps = cell.cellExtendedTooltipProps = classifySvc.getExtendedCellTooltipProps( clsObj, lastModifiedDate, currentClassName, parents );
            }
            cell.cellExtendedProperties = classifySvc.parseClsProperties( clsObj.properties );
            cell.cellProperties = cell.cellExtendedProperties;
            // Store the properties from clsObj for use in case of copy values
            cell.clsProperties = clsObj.properties.slice( clsObj.properties.length - ( classDefResponse[ classId ].attributes.length || clsObj.properties.length ) );
            cell.blockDataMap = clsObj.blockDataMap;
            cell.icoUid = clsObj.clsObject.uid;
            cells.push( cell );
        } );
    } else {
        eventBus.publish( 'classifyPanel.loadHierarchy' );
    }

    if( cells.length === 0 ) {
        cells = null;
    }
    return cells;
};

/**
 * Loads the standard ICS or CST hierarchy
 * @param {*} data
 */
export let loadHierarchy = function( data ) {
    data.children = classifySvc.getChildren( appCtxSvc.getCtx( 'ICO_response' ) );
    data.initialHierarchy = data.children;
    exports.setCreateMode( data );
};

/**
 * Parses the search string before sending to the server.
 *
 * @param {String} searchStr The search string to be parsed.
 *
 * @return {ObjectArray} An object to be used in the SOA request.
 */
export let parseSearchString = function( searchStr ) {
    return classifySvc.parseSearchString( searchStr );
};

/**
 * converts the search results into viewmodel properties.
 *
 * @param {Object} response the response from the classification search SOA
 *
 * @return {ObjectArray} the array of view model properties
 */
export let formatSearchResults = function( response ) {
    var searchResults = [];
    _.forEach( response.clsClassDescriptors,
        function( searchResult ) {
            var className = classifySvc.getPropertyValue( searchResult.properties, classifySvc.UNCT_CLASS_NAME );
            var classId = classifySvc.getPropertyValue( searchResult.properties, classifySvc.UNCT_CLASS_ID );
            var parents = classifySvc.getParentsPath( response.classParents[ classId ].parents );

            parents.push( className );
            var tempParentsPath = parents.join( '/' );
            var vmProperty = uwPropertyService.createViewModelProperty( tempParentsPath, className, 'STRING', '',
                '' );
            vmProperty.classData = searchResult;
            searchResults.push( vmProperty );
        } );

    return searchResults;
};

/**
 * Handles a search result selection
 *
 * @param {Object} data the declarative viewmodel data
 *
 */
export let searchResultSelected = function( data ) {
    //Unset Advanced Data flag to ensure it is set correctly
    data.advancedData = false;

    data.selectedClass = data.selectedSearchResult.classData;
    data.selectedClass.className = classifySvc.getPropertyValue( data.selectedClass.properties, classifySvc.UNCT_CLASS_NAME );
    data.selectedClass.objectType = classifySvc.getPropertyValue( data.selectedClass.properties, classifySvc.UNCT_CLASS_OBJECT_TYPE );

    var clsType = classifySvc.getPropertyValue( data.selectedClass.properties, classifySvc.UNCT_CLASS_TYPE );

    if( data.selectedClass.childCount === 0 && ( clsType === 'Class' || clsType === 'Group' ) ) {
        data.selectedClass.name = data.selectedClass.className;
        messagingService.reportNotyMessage( data, data._internal.messages, 'nonStorageClassMessage' );

        data.selectedClass.type = 'AbstractClass';
    }

    if( clsType === 'StorageClass' ) {
        data.selectedClass.type = 'StorageClass';
    }

    //Load the hierarchy for the selected node.
    data.selectedNode = data.selectedClass;

    var selectedClassId = classifySvc.getPropertyValue( data.selectedNode.properties, classifySvc.UNCT_CLASS_ID );

    data.selectedClass.id = selectedClassId;
    data.hierarchyVisible = true;
    data.hierarchyExpanded = true;

    if( data.selectedClass.childCount !== 0 ) {
        var searchCriteria = {};
        searchCriteria.searchAttribute = classifySvc.UNCT_CLASS_ID;
        searchCriteria.searchString = selectedClassId;
        searchCriteria.sortOption = classifySvc.UNCT_SORT_OPTION_CLASS_ID;

        var classDataOptions = null;

        //This needs to be removed in future once appropriate changes have been made to the hierarchy position implementation
        var supportedReleaseForSort = classifyUtils.checkIfSupportedTcVersionForSort( TcServerVersion.majorVersion,
            TcServerVersion.minorVersion, TcServerVersion.qrmNumber );

        if( supportedReleaseForSort ) {
            //classDataOptions += classifySvc.LOAD_CLASS_CHILDREN_ASC | classifySvc.loadStorageMetadata;
            classDataOptions += classifySvc.loadClassChildren | classifySvc.loadStorageMetadata;
        } else {
            //Original data options to keep
            classDataOptions += classifySvc.loadClassChildren | classifySvc.loadStorageMetadata;
        }

        var request = {
            workspaceObjects: [],
            searchCriterias: [ searchCriteria ],
            classificationDataOptions: classDataOptions
        };

        soaService.post( 'Internal-IcsAw-2019-12-Classification', 'findClassificationInfo3', request ).then(
            function( response ) {
                data.children = classifySvc.getChildren( response );
                data.parents = classifySvc.parseClassDescriptions( response, data.selectedClass.id );
                return response;
            } );
    }

    if( data.selectedClass.childCount !== 0 || data.selectedClass.type === 'AbstractClass' ) {
        //Selected an intermediate or abstract node, do not load attributes.
        return;
    }

    exports.getAttributes( data );
};

/**
 * gets the attribute data for rendering classification widgets & calls the attribute formatting method.
 *
 * @param {Object} data the declarative viewmodel data
 */
export let getAttributes = function( data ) {
    var request;
    if( data.isEditMode && data.ico && data.selectedClass.id === data.ico.classID ) {
        request = {
            workspaceObjects: [ {
                uid: data.ico.uid
            } ],
            searchCriterias: [],
            classificationDataOptions: classifySvc.loadStorageAttributes
        };
    } else {
        var searchCriteria = {};
        searchCriteria.searchAttribute = classifySvc.UNCT_CLASS_ID;
        searchCriteria.searchString = data.selectedClass.id;
        searchCriteria.sortOption = classifySvc.UNCT_SORT_OPTION_CLASS_ID;
        request = {
            workspaceObjects: [],
            searchCriterias: [ searchCriteria ],
            classificationDataOptions: classifySvc.loadStorageAttributes
        };
    }

    soaService.post( 'Internal-IcsAw-2019-12-Classification', 'findClassificationInfo3', request ).then(
        function( response ) {
            appCtxSvc.registerCtx( 'ICO_response', response );
            exports.formatDataAndResponse( response, data );
        } );
};


/**
 *  Following method processes the findClassificationInfo3 SOA response and make initializations on view model
 * @param {*} response findClassificationInfo3 SOA response
 * @param {*} data Declarative view model
 */
export let formatDataAndResponse = function( response, data ) {
    var response = appCtxSvc.getCtx( 'ICO_response' );
    // Contains list of class IDs and ClassDef info
    data.classDefinitionMapResponse = response.clsClassDescriptors;
    // Contains attributeDefinitionMap and configuredKeyLOVDefinitionMap
    // List of KeyLOV ID, and KeyLOV definition ( KeyLOVDefinition2 )
    data.keyLOVDefinitionMapResponse = response.keyLOVDescriptors;
    data.blockDefinitionMapResponse = response.clsBlockDescriptors;

    if( response.clsObjectDefs ) {
        data.clsObjInfo = response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ];
        _.forEach( response.clsObjectDefs[ 1 ][ 0 ].clsObjects, function( clsObject ) {
            if( classifySvc.getPropertyValue( clsObject.properties, classifySvc.UNCT_CLASS_ID ) === data.selectedClass.id ) {
                data.clsObjInfo = clsObject;
            }
        } );
    } else {
        data.clsObjInfo = null;
    }

    data.children = [];
    data.parents = classifySvc.parseClassDescriptions( response, data.selectedClass.id );
    data.hierarchyVisible = true;
    data.hierarchyExpanded = true;

    // Process image panel only if the image dataset is available
    data.expandImagesPanel = false;
    data.clsImgAvailable = false;

    data.datasetFilesOutput = data.classDefinitionMapResponse[ data.selectedClass.id ].documents;
    exports.formatImageAttachments( data );

    // Publish event to let the handler know about current state being in Create/Edit mode
    // This event is necessary to correctly handle the behavior where closePanel is called after
    // refresh action happens on secondary work area (See ClassificationCommandHandler).
    eventBus.publish( 'classifyPanel.inCreateOrEditMode', {} );

    exports.formatAttributes( data );
};

/**
 * Loads the hierarchy when the create panel is revealed
 *
 * @param {Object} data the declarative viewmodel data
 */
export let revealCreate = function( data, ctx ) {
    data.onSearchResultSelected = function( prop ) {
        data.selectedSearchResult = prop;
        exports.searchResultSelected( data );
    };
    data.isPanel = true;
    ctx.clsPanel = {
        classifyUnitsEnabled : data.unitSystem.isEnabled,
        updateMode: data.panelMode !== -1
    };
    if( data.panelMode && data.panelMode === 1 && data.createForStandalone !== true ) {
        return;
    }
    if( data.dataProviders && data.dataProviders.performSearch
         && data.dataProviders.performSearch.selectedObjects
          && data.dataProviders.performSearch.selectedObjects.length === 1
          && !appCtxSvc.ctx.deleteSingle ) {
        // If any ICO is selected then expand the hierarchy till that class and show the attributes for that class.
        data.attr_anno = null;
        data.children = null;
        //Unset Advanced Data flag to ensure it is set correctly
        data.advancedData = false;
        //used to check if a prompt is required when display a discard/save prompt for the user. This is to prevent duplicate messages from firing.
        data.isAlreadyPrompted = false;
        initialConvertCount = 2;
        data.hierarchyVisible = true;
        data.hierarchyExpanded = true;
            data.selectedClass = {
                id: data.dataProviders.performSearch.selectedObjects[ 0 ].cellInternalHeader1,
                className: data.dataProviders.performSearch.selectedObjects[ 0 ].cellHeader1
            };
        data.panelMode = 0;
        ctx.clsPanel.updateMode = true;
        data.localPropertyValues = {
            properties: data.dataProviders.performSearch.selectedObjects[ 0 ].clsProperties,
            blockDataMap: data.dataProviders.performSearch.selectedObjects[ 0 ].blockDataMap
        };

        exports.getAttributes( data );
        return;
    }

    delete data.localPropertyValues;
    delete appCtxSvc.ctx.deleteSingle;

    if( data.children && data.children.length > 0 ) {
        data.hierarchyVisible = true;
        data.hierarchyExpanded = true;
        data.attributesVisible = false;
        data.panelMode = 0;
        data.parents = [];
    } else {
        var searchCriteria = {};
        searchCriteria.searchAttribute = classifySvc.UNCT_CLASS_ID;
        searchCriteria.searchString = 'ICM';
        searchCriteria.sortOption = classifySvc.UNCT_SORT_OPTION_CLASS_ID;

        var classDataOptions = null;

        //This needs to be removed in future once appropriate changes have been made to the hierarchy position implementation
        var supportedReleaseForSort = classifyUtils.checkIfSupportedTcVersionForSort( TcServerVersion.majorVersion,
            TcServerVersion.minorVersion, TcServerVersion.qrmNumber );

        if( supportedReleaseForSort ) {
            //classDataOptions += classifySvc.LOAD_CLASS_CHILDREN_ASC | classifySvc.loadStorageMetadata;
            classDataOptions += classifySvc.loadClassChildren | classifySvc.loadStorageMetadata;
        } else {
            //Original data options to keep
            classDataOptions += classifySvc.loadClassChildren | classifySvc.loadStorageMetadata;
        }

        var request = {
            workspaceObjects: [],
            searchCriterias: [ searchCriteria ],
            classificationDataOptions: classDataOptions
        };

        soaService.post( 'Internal-IcsAw-2019-12-Classification', 'findClassificationInfo3', request ).then(
            function( response ) {
                data.children = classifySvc.getChildren( response );

                //This may need to be re-added in future once appropriate changes have been made to the hierarchy position implementation
                /*
                var temp = [];
                for( var i = data.children.length - 1; i >= 0; i-- ) {
                    temp.push( data.children[i] );
                }
                data.children = temp;
                */

                data.initialHierarchy = data.children;
                data.hierarchyVisible = true;
                data.hierarchyExpanded = true;
                data.attributesVisible = false;
                data.panelMode = 0;
                data.parents = [];
            } );
    }
    ctx.clsPanel.updateMode = data.panelMode !== -1;
};

/**
 * Resets the hierarchy within the classification panel back to default
 *
 * @param {Object} data the declarative viewmodel data
 */
export let resetHierarchy = function( data ) {
    //Clear the searchBox
    classifySvc.clearSearchBox( data );
    //Unset Advanced Data flag to ensure it is set correctly
    data.advancedData = false;

    data.selectedClass = null;

    if( data.initialHierarchy ) {
        data.children = data.initialHierarchy;
    } else {
        var searchCriteria = {};
        searchCriteria.searchAttribute = classifySvc.UNCT_CLASS_ID;
        searchCriteria.searchString = 'ICM';
        searchCriteria.sortOption = classifySvc.UNCT_SORT_OPTION_CLASS_ID;

        var classDataOptions = null;

        //This needs to be removed in future once appropriate changes have been made to the hierarchy position implementation
        var supportedReleaseForSort = classifyUtils.checkIfSupportedTcVersionForSort( TcServerVersion.majorVersion,
            TcServerVersion.minorVersion, TcServerVersion.qrmNumber );

        if( supportedReleaseForSort ) {
            //classDataOptions += classifySvc.LOAD_CLASS_CHILDREN_ASC | classifySvc.loadStorageMetadata;
            classDataOptions += classifySvc.loadClassChildren | classifySvc.loadStorageMetadata;
        } else {
            //Original data options to keep
            classDataOptions += classifySvc.loadClassChildren | classifySvc.loadStorageMetadata;
        }

        var request = {
            workspaceObjects: [],
            searchCriterias: [ searchCriteria ],
            classificationDataOptions: classDataOptions
        };

        soaService.post( 'Internal-IcsAw-2019-12-Classification', 'findClassificationInfo3', request ).then(
            function( response ) {
                data.children = classifySvc.getChildren( response );
                data.initialHierarchy = data.children;
            } );
    }

    data.hierarchyVisible = true;
    data.hierarchyExpanded = true;
    data.attributesVisible = false;
    data.parents = [];
};

/*
 * activates edit mode on item
 *
 * @param {Object} data the declarative viewmodel data
 */
export let editMode = function( data ) {
    data.attr_anno = null;
    data.children = null;
    //Unset Advanced Data flag to ensure it is set correctly
    data.advancedData = false;
    //used to check if a prompt is required when display a discard/save prompt for the user. This is to prevent duplicate messages from firing.
    data.isAlreadyPrompted = false;
    initialConvertCount = 2;
    data.hierarchyExpanded = true;
    data.panelMode = 1;
    data.ico = {
        uid: data.selectedCell.icoUid,
        classID: data.selectedCell.cellInternalHeader1
    };

    var context;
    if( data.standaloneObjectExists && data.standaloneObjectExists === true ) {
        context = {
            destPanelId: 'Awp0CreateClassificationSub',
            title: data.i18n.Classify,
            recreatePanel: true,
            supportGoBack: false
        };
    } else {
        context = {
            destPanelId: 'Awp0CreateClassificationSub',
            title: data.i18n.edit,
            recreatePanel: true,
            supportGoBack: true
        };
    }
    eventBus.publish( 'awPanel.navigate', context );

    data.selectedClass = {
        id: data.selectedCell.cellInternalHeader1,
        className: data.selectedCell.cellHeader1
    };

    data.isEditMode = true;

    // If standalone, then notify the user to either connect, or create new!
    if( data.standaloneObjectExists && data.standaloneObjectExists === true ) {
        eventBus.publish( 'classifyPanel.promptToHandleStandalone', {
            scope: {
                data: data
            }
        } );
    }
    return exports.getAttributes( data );
};

/**
 * Formats the classification class Image attachments so that they can be displayed in the UI. Currently, only
 * static images with .GIF, .JPG, .JPEG, .PNG and .BMP extensions are supported The support for other
 * attachments such as PDF, 3-d images (.hpg) is currently not there.
 *
 * @param {Object} data - The view-model data object
 */
export let formatImageAttachments = function( data ) {
    var imageURLs = [];
    if( data.datasetFilesOutput && data.datasetFilesOutput.length > 0 && data.datasetFilesOutput[ 0 ] ) {
        _.forEach( data.datasetFilesOutput, function( dsOutputArrElement ) {
            var ticket = dsOutputArrElement.ticket;
            if( classifyUtils.isSupportedImageType( ticket ) ) {
                var thumbnailUrl = browserUtils.getBaseURL() + 'fms/fmsdownload/' +
                    fmsUtils.getFilenameFromTicket( ticket ) + '?ticket=' + ticket;
                imageURLs.push( thumbnailUrl );

                data.clsImgAvailable = true;
            }
        } );
    }
    data.imageURLs = imageURLs;
};

/**
 * Sets the unit system state on the panel.
 *
 * @param {Object} data - The viewmodel data object
 */
export let setUnitSystem = function( data ) {
    var unitSystemEnabled;

    var classUnitSystem = classifySvc.getPropertyValue( data.classDefinitionMapResponse[ data.selectedClass.id ].properties,
        classifySvc.UNCT_CLASS_UNIT_SYSTEM );

    data.unitSystem.dbValue = classUnitSystem === 'metric' || classUnitSystem === 'both';
    unitSystemEnabled = classUnitSystem === 'both';

    data.unitSystem.isEditable = unitSystemEnabled;
    data.unitSystem.isEnabled = unitSystemEnabled;
    var ctx = appCtxSvc.getCtx( 'clsPanel' );
    ctx.classifyShowMetric  = data.unitSystem.dbValue;
    ctx.classifyUnitsEnabled = data.unitSystem.isEnabled;
    appCtxSvc.updateCtx( 'clsPanel', ctx );
};

export let clearAllProperties = function( data ) {
    try {
        data.clearProperties = true;
        classifySvc.clearAttributes( data );
    } finally {
        data.clearProperties = false;
    }
};

/**
 * Formats the classification attributes so they can be displayed in the ui.
 *
 * @param {Object} data - The viewmodel data object
 */
export let formatAttributes = function( data ) {
    if( data.isEditMode === true && data.clsObjInfo ) {
        var icoUnitSystem = classifySvc.getPropertyValue( data.clsObjInfo.properties, classifySvc.UNCT_CLASS_UNIT_SYSTEM );
        data.unitSystem.dbValue = icoUnitSystem === 'metric' || icoUnitSystem === 'UNSPECIFIED';

        var unitSystemEnabled = classifySvc.getPropertyValue(
            data.classDefinitionMapResponse[ data.selectedClass.id ].properties, classifySvc.UNCT_CLASS_UNIT_SYSTEM ) === 'both';

        data.unitSystem.isEditable = unitSystemEnabled;
        data.unitSystem.isEnabled = unitSystemEnabled;
    } else {
        exports.setUnitSystem( data );
    }

    //Set the visibility of panel sections;
    data.hierarchyVisible = true;
    data.attributesVisible = true;

    //Format the attributes for display
    var attributesDefinitions = data.classDefinitionMapResponse[ data.selectedClass.id ].attributes;

    data.attr_anno = [];
    data.prop_anno = [];

    var valuesMap = null;
    if( data.clsObjInfo && data.ico ) {
        valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, data.clsObjInfo.properties, data.clsObjInfo.blockDataMap );
    } else if( data.panelMode === 0 && typeof data.localPropertyValues === 'object' && !data.clearProperties ) {
        valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, data.localPropertyValues.properties, data.localPropertyValues.blockDataMap );
    }
    classifySvc.formatAttributeArray( data, attributesDefinitions, valuesMap, data.attr_anno, '', true, false, null, null, data.clearProperties );
    //If the class contains advanced data, then empty out properties and display warning in panel
    if( data.advancedData ) {
        data.attr_anno = null;
    }
};

/*
 * Calls the valuesMap function to create the block data map and return it.
 *
 * @param {Object} data - the viewmodel data for this panel
 * @returns class blocks
 */
export let getClassBlocks = function( data ) {
    var valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, null, null, data.attr_anno );
    return valuesMap.blockProperties;
};

/*
 * Compiles the classification properties and their values to be sent in the classify operation.
 *
 * @param {Object} data - the viewmodel data for this panel
 * @returns clsObj
 */
export let getClassProperties = function( data ) {
    var properties = [];

    //Create ValuesMap, from data.attr_anno, then get the properties from it
    var valuesMap = classifyUtils.getClsUtilValueMap( data, data.selectedClass.id, null, null, data.attr_anno );
    properties = valuesMap.properties;

    // Classification object id
    var icoId = data.ico ? data.ico.uid : '';
    properties.push( {
        propertyId: classifySvc.UNCT_ICO_UID,
        propertyName: '',
        values: [ {
            internalValue: icoId,
            displayValue: icoId
        } ]
    } );

    // Classification class id
    properties.push( {
        propertyId: classifySvc.UNCT_CLASS_ID,
        propertyName: '',
        values: [ {
            internalValue: data.selectedClass.id,
            displayValue: data.selectedClass.id
        } ]
    } );

    // ICO unit system
    var currentUnitSystem = data.unitSystem.dbValue ? '0' : '1';
    properties.push( {
        propertyId: classifySvc.UNCT_CLASS_UNIT_SYSTEM,
        propertyName: '',
        values: [ {
            internalValue: currentUnitSystem,
            displayValue: currentUnitSystem
        } ]
    } );

    // Push a special property to indicate the standalone needs to be connected.
    // Now, if the user has chosen to create a new classification( instead of connecting to existing),
    // then we don't not need to set this property.
    if( data.standaloneObjectExists && data.standaloneObjectExists === true && !data.createForStandalone ) {
        properties.push( {
            // Currently using this 'nowhere defined' value for ICS_CONNECT_STANDALONE property.
            // We need a better mechanism than this to send it to SOA though
            propertyId: classifySvc.ICS_CONNECT_STANDALONE,
            propertyName: '',
            values: [ {
                internalValue: 'true',
                displayValue: 'true'
            } ]
        } );
    }

    data.isEditMode = false;
    var property = {};
    property.sanCommandId = 'classify_save';
    property.sanCommandTitle = data.selectedClass.objectType;

    analyticsSvc.logNonDeclarativeCommands( property );
    return properties;
};

/**
 * detects if a selected node is storage node or hierarchy node and calls the corresponding methods
 *
 * @param {Object} selectedNode - selected node
 * @param {Object} data data in the viewModel
 */
export let detectNodeType = function( selectedNode, data ) {
    //used to check if a prompt is required when display a discard/save prompt for the user. This is to prevent duplicate messages from firing.
    data.isAlreadyPrompted = false;
    data.selectedClass = selectedNode;
    var clssId = null;
    data.advancedData = false;

    if( selectedNode !== null && selectedNode.childCount === 0 ) {
        if( selectedNode.type === 'StorageClass' ) {
            exports.getAttributes( data );
        } else {
            data.selectedClass.name = data.selectedClass.className;
            messagingService.reportNotyMessage( data, data._internal.messages, 'nonStorageClassMessage' );
        }
    } else {
        if( selectedNode === null ) {
            clssId = 'ICM';
        } else {
            clssId = selectedNode.id;
        }

        var searchCriteria = {};
        searchCriteria.searchAttribute = classifySvc.UNCT_CLASS_ID;
        searchCriteria.searchString = clssId;
        searchCriteria.sortOption = classifySvc.UNCT_SORT_OPTION_CLASS_ID;

        var classDataOptions = null;

        //This needs to be removed in future once appropriate changes have been made to the hierarchy position implementation
        var supportedReleaseForSort = classifyUtils.checkIfSupportedTcVersionForSort( TcServerVersion.majorVersion,
            TcServerVersion.minorVersion, TcServerVersion.qrmNumber );

        if( supportedReleaseForSort ) {
            //classDataOptions += classifySvc.LOAD_CLASS_CHILDREN_ASC | classifySvc.loadStorageMetadata;
            classDataOptions += classifySvc.loadClassChildren | classifySvc.loadStorageMetadata;
        } else {
            //Original data options to keep
            classDataOptions += classifySvc.loadClassChildren | classifySvc.loadStorageMetadata;
        }

        var request = {
            workspaceObjects: [],
            searchCriterias: [ searchCriteria ],
            classificationDataOptions: classDataOptions
        };

        soaService.post( 'Internal-IcsAw-2019-12-Classification', 'findClassificationInfo3', request ).then(
            function( response ) {
                data.children = classifySvc.getChildren( response );
                //This needs to be removed in future once appropriate changes have been made to the hierarchy position implementation
                data.children = data.children.reverse();
            } );
        data.attributesVisible = false;
    }
};

/**
 * Determines whether values can be converted on current version of AW
 *
 * @param {Object} data - the viewmodel data object,
 * @param {bool} bypass - variable used to bypass check, used in Unit Tests
 */
export let convertValues = function( data, bypass ) {
    if( initialConvertCount === 0 || bypass ) {
        classifySvc.convertValues( data );
    } else {
        initialConvertCount--;
    }
};

/**
 *
 * @param {*} selected  Selected WSO
 * @param {*} data The declarative view model
 * @param {*} ctx Application context
 */
export let findClassificationObjects2 = function( selected, data, ctx ) {
    // Cleanup any standalone related variables.
    classifySvc.cleanupStandaloneData( data );
    //Set the target for classify operations
    classifySvc.setTargetObjectForSelection( selected, data );
    classifySvc.setViewMode( data );
    eventBus.publish( 'classifyPanel.loadCells' );
};

/**
 * To get classified workspace object id
 * @param {response} response the declarative viewmodel data
 *
 */
export let getClassifiedWorkspaceObjectID = function( response ) {
    return classifySvc.getClassifiedWorkspaceObjectID( response );
};

/**
 * Method for detecting if a WSO is classified or not
 *
 * @param {Object} selected the selected object.
 * @param {Object} data the declarative viewmodel data
 */
export let findClassificationObjects = function( selected, data ) {
    var deferred = AwPromiseService.instance.defer();
    // This will reset the selected class so that no Assign button is visible while viewing the ICOs
    data.selectedClass = {};

    // Cleanup any standalone related variables.
    classifySvc.cleanupStandaloneData( data );

    //Set the target for classify operations
    eventBus.publish( 'classifyPanel.resetClose' );
    classifySvc.setTargetObjectForSelection( selected, data );
    var request = {
        workspaceObjects: [ {
            uid: selected.uid
        } ],
        searchCriterias: [],
        classificationDataOptions: classifySvc.loadStorageMetadata
    };
    // Call search to check if currently selected object is classified
    soaService
        .postUnchecked( 'Internal-IcsAw-2019-12-Classification', 'findClassificationInfo3', request )
        .then(
            function( response ) {
                if( response ) {
                    if( response.ServiceData && response.ServiceData.partialErrors ) {
                        throw soaService.createError( response.ServiceData );
                    }
                    if( response.clsObjectDefs && response.clsObjectDefs.length !== 0 ) {
                        if( response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ].workspaceObject.uid === 'AAAAAAAAAAAAAA' ) {
                            //Standalone ICO exists; pop up connect message

                            var clsObj = response.clsObjectDefs[ 1 ][ 0 ].clsObjects[ 0 ];

                            var classId = classifySvc.getPropertyValue( clsObj.properties, classifySvc.UNCT_CLASS_ID );

                            //response.clsDefMap[classId].properties, UNCT_CLASS_NAME
                            // The vars required in editMode
                            data.selectedCell = {
                                icoUid: clsObj.clsObject.uid,
                                cellInternalHeader1: classId,
                                cellHeader1: classifySvc.getPropertyValue(
                                    response.clsClassDescriptors[ classId ].properties, classifySvc.UNCT_CLASS_NAME )
                            };

                            // The vars required in editMode method to distinguish between
                            // 'regular' edit and 'standalone' edit
                            data.standaloneObjectExists = true;
                            data.clsObjTag = clsObj.clsObject;

                            // Display the Edit mode
                            exports.editMode( data, selected );
                        } else {
                            // Object is classified. Open 'View' panel
                            if( data.activeView === 'Awp0ViewClassificationSub' ) {
                                eventBus.publish( 'classifyPanel.loadCells' );
                            } else {
                                classifySvc.setViewMode( data, true );
                            }
                        }
                    } else {
                        //Open 'Create' panel
                        data.children = classifySvc.getChildren( response );
                        data.initialHierarchy = data.children;
                        exports.setCreateMode( data );
                    }
                }
                deferred.resolve();
            } ).catch( function( error ) {
                deferred.reject( error );
            } );
            return deferred.promise;
};

/*
 * Handles show/hide metricsection
 *
 * @param {Object} data - view model data
 */
export let showHideMetricSystem = function( data ) {
    initialConvertCount = 0;
    if ( data.unitSystem.isEnabled && data.eventData.metric !== data.unitSystem.dbValue ) {
        data.unitSystem.dbValue = !data.unitSystem.dbValue;
        exports.convertValues( data );
        var ctx = appCtxSvc.getCtx( 'clsPanel' );
        ctx.classifyShowMetric  = data.unitSystem.dbValue;
        appCtxSvc.updateCtx( 'clsPanel', ctx );
    }
};

/*
* Handles import of classification data
* @param { dataFiles } list of full length file paths of importable BMEcat CLS files
*/
export let updateCLSImportListbox = function( dataFiles ) {
    let fileList = [];
    fileList.push( {
        propDisplayValue: '',
        propInternalValue: '',
        propDisplayDescription: '',
        sel: false
    } );
    for( var k = 0; k < dataFiles.length; k++ ) {
        let file = {
            propDisplayValue: '',
            propInternalValue: '',
            propDisplayDescription: '',
            sel: false
        };
        let delimiterIndex = dataFiles[ k ].lastIndexOf( '\\' ) + 1;
        if( delimiterIndex === 0 ) {
            //server is using Linux file delimiters
            delimiterIndex = dataFiles[ k ].lastIndexOf( '/' ) + 1;
        }
        let shortName = '';
        if ( delimiterIndex === 0 ) {
            shortName = dataFiles[ k ];
        } else {
            shortName = dataFiles[k].substring( delimiterIndex );
        }
        file.propDisplayValue = shortName;
        file.propInternalValue = dataFiles[ k ];

        fileList.push( file );
    }
    return fileList;
};


/*
* Handles file selection from clsdata import dropdown list
* @param {Object} data - view model data
*/
export let selectClsDataImportFile = function( data ) {
    if( data.potentialImportsListBox.dbValue && data.potentialImportsListBox.displayValues[0] ) {
        data.selectedClsImportFile = {
            relativePath: data.potentialImportsListBox.dbValue,
            fileName: data.potentialImportsListBox.displayValues[0]
        };
    } else {
        data.selectedClsImportFile = {};
    }
};

/*
* Clears objects that were loaded into classificationDataFiles. This is to ensure no files exist on dropdown after selecting incorrect files
*/
export let clearCLSImportListbox = function( ) {
    return [];
};

export default exports = {
    clearAllProperties,
    clearCLSImportListbox,
    convertValues,
    detectNodeType,
    editMode,
    findClassificationObjects,
    findClassificationObjects2,
    formatAttributes,
    formatDataAndResponse,
    formatImageAttachments,
    formatSearchResults,
    searchResultSelected,
    generateCells,
    getClassBlocks,
    getClassifiedWorkspaceObjectID,
    getClassProperties,
    getAttributes,
    loadHierarchy,
    parseSearchString,
    revealCreate,
    resetHierarchy,
    setCreateMode,
    setCreateModeForStandalone,
    setupStandaloneData,
    showHideMetricSystem,
    setUnitSystem,
    selectClsDataImportFile,
    updateCLSImportListbox
};
/**
 * Classification panel service utility
 *
 * @memberof NgServices
 * @member classifyPanelService
 */
app.factory( 'classifyPanelService', () => exports );
