// Copyright 2019 Siemens Product Lifecycle Management Software Inc.

/* global define */

/**
 * Note: This module does not return an API object. The API is only available when the service defined this module is
 * injected by AngularJS.
 *
 * @module js/Ctm1ContentMgmtImportService
 */
import app from 'app';
import cdm from 'soa/kernel/clientDataModel';
import dmSvc from 'soa/dataManagementService';
import pasteSvc from 'js/pasteService';
import appCtxService from 'js/appCtxService';
import eventBus from 'js/eventBus';
import localeSvc from 'js/localeService';
import $ from 'jquery';
import _ from 'lodash';

var exports = {};

// Model Property service

var _localizedText = {};

export let getTypeFilters = function( array ) {
    var rString = '';

    // Find all checked or unchecked rows in list and append them to one string
    for( var i = 0; i < array.length; ++i ) {
        rString += '.';
        rString += array[ i ];
        rString += ', ';
    }

    // remove extra comma and space characters
    if( rString.length > 1 ) {
        rString = rString.substring( 0, rString.length - 2 );
    }

    return rString;
};

var getCheckedArray = function( list, checked = 'TRUE' ) {
    var array = [];

    // Find all checked or unchecked rows in list
    for( var i = 0; i < list.length; ++i ) {
        var dbVal = 'FALSE';
        if( list[ i ].dbValue === true ) {
            dbVal = 'TRUE';
        }

        var dispVal = list[ i ].displayValues[ 0 ].toUpperCase();
        if( dbVal === checked || dispVal === checked ) {
            array.push( list[ i ] );
        }
    }

    return array;
};

export let getImportGraphicOptionInputs = function( data ) {
    var languageArray = getCheckedArray( data.languagesList );
    var usageArray = getCheckedArray( data.graphicUsagesList );

    var languages = '';
    for( let i = 0; i < languageArray.length; ++i ) {
        let value = languageArray[ i ].propertyName;
        languages += value + ';';
    }

    var usages = '';
    for( let i = 0; i < usageArray.length; ++i ) {
        let value = usageArray[ i ].internalValue;
        usages += value + ' ';
    }

    // remove extra character
    if( languages.length > 0 ) {
        languages = languages.substring( 0, languages.length - 1 );
    }

    // remove extra character
    if( usages.length > 0 ) {
        usages = usages.substring( 0, usages.length - 1 );
    }

    if( data.graphicUsageCheckbox.dbValue === true ) {
        usages = 'GAM';
    }

    var overwriteMode = data.overwriteMode.dbValue;
    if( overwriteMode === 'overwrite' ) {
        overwriteMode = data.overwriteOptions.dbValue;
    }

    var inputs = [];

    var input = {
        clientId: 'IMPORT_GRAPHIC_OPTION',
        graphicAttrMapping: data.graphicAttributeMapping.uiValue,
        graphicUsages: usages,
        graphicClassName: data.graphicClassname.dbValue,
        language: languages,
        nameAndSize: [],
        overwriteMode: overwriteMode
    };

    for( var i = 0; i < data.files.length; ++i ) {
        var nameAndSize = {
            name: data.files[ i ].name,
            size: data.files[ i ].size.toString(),
            transientFileWriteTicket: data.fmsTickets[ i ].ticket
        };

        input.nameAndSize.push( nameAndSize );
    }

    inputs.push( input );

    return inputs;
};

export let getImportInputs = function( data, importType ) {
    var input = [];
    for( var i = 0; i < data.files.length; ++i ) {
        var inp = {
            clientId: 'BulkImortOperation',
            transientFileReadTicket: data.fmsTickets[ i ].ticket,
            keyValueArgs: {
                type: importType
            },
            businessObject: {
                uid: 'AAAAAAAAAAAAAA'
            }
        };
        input.push( inp );
    }
    return input;
};

export let getImportTopicInputs = function( data ) {
    var inputs = [];

    for( var i = 0; i < data.files.length; ++i ) {
        var input = {
            clientId: 'IMPORT_TOPIC',
            keyValueArgs: {
                Type: 'Import',
                Overwrite_existing: data.overwriteExistingCheckbox.uiValue,
                Find_by_content: data.findByContentCheckbox.uiValue,
                Find_by_XML_number: data.findByXMLNumberCheckbox.uiValue,
                Graphic_attr_mapping: data.graphicAttributeMapping.uiValue,
                Graphic_mode: data.graphicMode.dbValue
            },
            transientFileWriteTicket: data.fmsTickets[ i ].ticket
        };

        inputs.push( input );
    }

    return inputs;
};

export let getImportDitaMapInputs = function( data ) {
    var inputs = [];

    for( var i = 0; i < data.files.length; ++i ) {
        var input = {
            clientId: 'IMPORT_TOPIC',
            keyValueArgs: {
                Type: 'ImportDitaMap',
                Orig_file_name: data.filenameBox.uiValue,
                Overwrite_existing: data.overwriteExistingCheckbox.uiValue,
                Find_by_content: data.findByContentCheckbox.uiValue,
                Find_by_XML_number: data.findByXMLNumberCheckbox.uiValue,
                Graphic_attr_mapping: data.graphicAttributeMapping.uiValue,
                Graphic_mode: data.graphicMode.dbValue
            },
            transientFileWriteTicket: data.fmsTickets[ i ].ticket
        };

        inputs.push( input );
    }

    return inputs;
};

export let setGraphicUsagesFromMapping = function( data ) {
    if( data.preferences.ctm0GraphicUsagePref && data.files.length > 0 ) {
        for( let z = 0; z < data.graphicUsagesList.length; ++z ) {
            data.graphicUsagesList[ z ].dbValue = false;
            data.graphicUsagesList[ z ].dbValues = 'FALSE';
        }

        for( let x = 0; x < data.preferences.ctm0GraphicUsagePref.length; ++x ) {
            var row = data.preferences.ctm0GraphicUsagePref[ x ];
            var usage = row.substring( 0, row.indexOf( '=' ) );
            var fileExts = row.substring( row.indexOf( '=' ) + 1 );

            var sArray = fileExts.split( ';' );
            for( let i = 0; i < sArray.length; ++i ) {
                var ext = sArray[ i ].substring( 1 );

                for( let f = 0; f < data.files.length; ++f ) {
                    if( data.files[ f ].name.indexOf( ext ) > 0 ) {
                        for( let z = 0; z < data.graphicUsagesList.length; ++z ) {
                            if( data.graphicUsagesList[ z ].internalValue.toUpperCase() === usage.toUpperCase() ) {
                                data.graphicUsagesList[ z ].dbValue = true;
                                data.graphicUsagesList[ z ].dbValues = 'TRUE';
                            }
                        }
                    }
                }
            }
        }
    }

    exports.checkImportGraphicValid( data );
};

export let checkImportGraphicValid = function( data ) {
    var languageArray = getCheckedArray( data.languagesList );
    var usageArray = getCheckedArray( data.graphicUsagesList );

    if( data.files && data.files.length > 0 && languageArray.length > 0 &&
        ( usageArray.length > 0 || data.graphicUsageCheckbox.dbValue === true ) ) {
        data.Ctm1ImportValid = true;
    } else {
        data.Ctm1ImportValid = false;
    }
};

export let checkImportTopicValid = function( data ) {
    if( data.findByXMLNumberCheckbox.uiValue === 'True' ||
        data.findByXMLNumberCheckbox.uiValue === 'true' ||
        data.findByXMLNumberCheckbox.uiValue === 'TRUE' ) {
        data.overwriteExistingCheckbox.isEnabled = true;
    } else {
        data.overwriteExistingCheckbox.isEnabled = false;
    }

    if( data.files && data.files.length > 0 ) {
        data.Ctm1ImportValid = true;
    } else {
        data.Ctm1ImportValid = false;
    }
};

export let checkImportDitaMapValid = function( data ) {
    if( data.findByXMLNumberCheckbox.uiValue === 'True' ||
        data.findByXMLNumberCheckbox.uiValue === 'true' ||
        data.findByXMLNumberCheckbox.uiValue === 'TRUE' ) {
        data.overwriteExistingCheckbox.isEnabled = true;
    } else {
        data.overwriteExistingCheckbox.isEnabled = false;
    }

    if( data.files && data.files.length > 0 && data.filenameBox.uiValue.length > 0 ) {
        data.Ctm1ImportValid = true;
    } else {
        data.Ctm1ImportValid = false;
    }
};

export let updateDitaMapFilename = function( data ) {
    var separator = '$';
    if( data.preferences.ctm0FileNameSeparator ) {
        separator = data.preferences.ctm0FileNameSeparator[ 0 ];
    }

    if( data.fileName && data.fileName.length > 0 ) {
        var ditaMapFilename = '';
        if( data.fileName.indexOf( separator ) === -1 ) {
            ditaMapFilename += 'A';
            ditaMapFilename += separator;
        }
        var tmp = data.fileName.substring( 0, data.fileName.lastIndexOf( '.' ) );
        if( tmp.indexOf( '_' ) > 0 ) {
            tmp = tmp.substring( 0, tmp.indexOf( '_' ) );
        }
        ditaMapFilename += tmp;
        ditaMapFilename += '.ditamap';
        data.filenameBox.uiValue = ditaMapFilename;
        data.filenameBox.dbValue = ditaMapFilename;
    } else {
        data.filenameBox.uiValue = '';
        data.filenameBox.dbValue = '';
    }

    exports.checkImportDitaMapValid( data );
};

export let checkImportGraphicOverwriteMode = function( data ) {
    if( data.overwriteMode.dbValue === 'overwrite' ) {
        data.overwriteOptions.isEnabled = true;
    } else {
        data.overwriteOptions.isEnabled = false;
    }
};

export let getTransientFileInfos = function( data ) {
    var transientFileInfos = [];

    for( var i = 0; i < data.files.length; ++i ) {
        var fileInfo = {
            fileName: data.files[ i ].name,
            isBinary: true,
            deleteFlag: true
        };

        transientFileInfos.push( fileInfo );
    }

    return transientFileInfos;
};

export let updateFormData = function( data ) {
    // if index isn't set, then set to zero
    if( !data.fmsTickets.index ) {
        data.fmsTickets.index = 0;

        // disable import button
        data.Ctm1ImportValid = false;
    }

    // create form for upload and increment index
    if( data.fmsTickets.index < data.fmsTickets.length ) {
        var form = $( '#fileUploadForm' );

        if( form && form.length > 0 ) {
            data.formData = new FormData();
            data.formData.append( 'fmsFile', form[ 0 ][ 0 ].files[ data.fmsTickets.index ], data.fmsTickets[ data.fmsTickets.index ].transientFileInfo.fileName );

            var fileData = {
                key: 'fmsTicket',
                value: data.fmsTickets[ data.fmsTickets.index ].ticket
            };

            data.formData.append( fileData.key, fileData.value );
        }

        ++data.fmsTickets.index;
    }
};

export let checkUploadsComplete = function( data ) {
    if( data.fmsTickets.index < data.fmsTickets.length ) {
        eventBus.publish( 'ctm1.fmsTicketGenerated', {} );
    } else {
        eventBus.publish( 'ctm1.fileUploadedComplete', {} );
    }
};

var pasteTo = function( target, objects ) {
    if( target && objects.length > 0 ) {
        pasteSvc.execute( target, objects, '' ).then( function() {
            eventBus.publish( 'cdm.relatedModified', {
                relatedModified: [ target ]
            } );
        } );
    }
};

var pasteToFolder = function( folderUid, pasteObjects ) {
    if( !folderUid || !pasteObjects ) {
        return;
    }
    var folderObject = cdm.getObject( folderUid );
    pasteTo( folderObject, pasteObjects );
};

var pasteObject = function( user, pasteObjects ) {
    var folderUid = null;

    // if a folder is selected and it is not the home folder, use that
    var ctx = appCtxService.ctx;
    if( ctx.selected && ctx.mselected.length === 1 && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Folder' ) > -1 && ctx.selected.modelType.typeHierarchyArray.indexOf( 'Fnd0HomeFolder' ) === -1 ) {
        folderUid = appCtxService.ctx.selected.uid;
    } else if( user.props.newstuff_folder ) {
        // else use the new stuff folder if it's in user object
        folderUid = user.props.newstuff_folder.dbValue;
    }

    if( folderUid ) {
        pasteToFolder( folderUid, pasteObjects );
    } else {
        // else newstuff folder property is missing for user so retrieve it
        dmSvc.getProperties( [ user.uid ], [ 'newstuff_folder' ] ).then( function( values ) {
            if( values ) {
                var modelObjects = Object.values( values.modelObjects );
                for( var y = 0; y < modelObjects.length; ++y ) {
                    if( modelObjects[ y ].type === 'Newstuff Folder' ) {
                        folderUid = modelObjects[ y ].uid;

                        // save newstuff folder data back to user props so it can be used next time
                        user.props.newstuff_folder = modelObjects[ y ];
                        user.props.newstuff_folder.dbValue = folderUid;
                        break;
                    }
                }
            }

            pasteToFolder( folderUid, pasteObjects );
        } );
    }
};

export let pasteTopic = function( user, data ) {
    var pasteObjects = [];

    if( data && data.ServiceData && data.ServiceData.created && data.ServiceData.created.length > 0 ) {
        _.forEach( data.ServiceData.created, function( importedTopicUid ) {
            var modelObject = null;
            if( data.ServiceData.modelObjects ) {
                modelObject = data.ServiceData.modelObjects[ importedTopicUid ];
            } else {
                modelObject = cdm.getObject( importedTopicUid );
            }

            if( modelObject ) {
                pasteObjects.push( modelObject );
            }
        } );

        pasteObject( user, pasteObjects );
    }
};

export let pasteGraphics = function( user, data ) {
    var pasteObjects = [];
    // find the graphics objects that will be pasted
    var modelObjects = Object.values( data.eventData.importData.ServiceData.modelObjects );
    for( var y = 0; y < modelObjects.length; ++y ) {
        if( modelObjects[ y ].modelType.typeHierarchyArray.indexOf( 'GraphicOptionRevision' ) > -1 ) {
            pasteObjects.push( modelObjects[ y ] );
        }
    }

    pasteObject( user, pasteObjects );
};

export let pasteImportedObjects = function( user, data, classname ) {
    var pasteObjects = [];
    // find the DM objects that will be pasted
    var modelObjects = Object.values( data.eventData.importData.ServiceData.modelObjects );
    for( var y = 0; y < modelObjects.length; ++y ) {
        if( modelObjects[ y ].modelType.typeHierarchyArray.indexOf( classname ) > -1 ) {
            pasteObjects.push( modelObjects[ y ] );
        }
    }

    pasteObject( user, pasteObjects );
};

export let importTranslation = function( data ) {
    // TODO call new SOA

    var eventData = { source: 'toolAndInfoPanel' };
    eventBus.publish( 'complete', eventData );
};

export let getImportedGraphicName = function( data, declViewModel ) {
    var names = [];

    if( data && data.ServiceData && data.ServiceData.modelObjects ) {
        var modelObjects = Object.values( data.ServiceData.modelObjects );
        for( var y = 0; y < modelObjects.length; ++y ) {
            if( modelObjects[ y ].modelType.typeHierarchyArray.indexOf( 'GraphicOptionRevision' ) > -1 ) {
                names.push( modelObjects[ y ].props.object_name.uiValues );
            }
        }
    }

    return names.length === 1 ? names[0] : names.length + ' ' + declViewModel.i18n.files;
};

export let getImportedName = function( data, classname ) {
    var name = '';

    if( data && data.ServiceData && data.ServiceData.modelObjects ) {
        var modelObjects = Object.values( data.ServiceData.modelObjects );
        for( var y = 0; y < modelObjects.length; ++y ) {
            if( modelObjects[ y ].modelType.typeHierarchyArray.indexOf( classname ) > -1 ) {
                name = modelObjects[ y ].props.object_name.uiValues;
            }
        }
    }

    return name;
};

/**
 * Handle Import command select
 * @param {Object} data The panel's view model object
 */
export let importTypeSelectionJs = function( data ) {
    var selectedType = data.dataProviders.importCommandListDataProvider.selectedObjects;
    if ( selectedType && selectedType.length > 0 ) {
        data.selectedType.dbValue = selectedType[0].internalName;
    }
};

var loadConfiguration = function() {
    localeSvc.getTextPromise( 'ContentMgmtMessages', true ).then(
        function( localTextBundle ) {
            _localizedText = localTextBundle;
        } );
};

loadConfiguration();

/**
 * Ctm1ContentMgmtImportService factory
 */

export default exports = {
    getTypeFilters,
    getImportGraphicOptionInputs,
    getImportInputs,
    getImportTopicInputs,
    getImportDitaMapInputs,
    setGraphicUsagesFromMapping,
    checkImportGraphicValid,
    checkImportTopicValid,
    checkImportDitaMapValid,
    updateDitaMapFilename,
    checkImportGraphicOverwriteMode,
    getTransientFileInfos,
    updateFormData,
    checkUploadsComplete,
    pasteTopic,
    pasteGraphics,
    pasteImportedObjects,
    importTranslation,
    getImportedGraphicName,
    getImportedName,
    importTypeSelectionJs
};
app.factory( 'Ctm1ContentMgmtImportService', () => exports );
