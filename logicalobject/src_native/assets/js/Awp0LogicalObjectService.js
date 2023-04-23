// @<COPYRIGHT>@
// ==================================================
// Copyright 2015.
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
 * @module js/Awp0LogicalObjectService
 */
import app from 'app';
import AwPromiseService from 'js/awPromiseService';
import appCtxSvc from 'js/appCtxService';
import msgService from 'js/messagingService';
import cdm from 'soa/kernel/clientDataModel';
import eventBus from 'js/eventBus';
import $ from 'jquery';

/** The exports */
var exports = {};

/** C++ keywords */
var cppKeywords = [ 'asm', 'auto', 'bool', 'break', 'case', 'catch', 'char', 'class', 'const', 'const_cast',
    'continue', 'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit', 'export',
    'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace',
    'new', 'operator', 'private', 'protected', 'public', 'register', 'reinterpret_cast', 'return', 'short',
    'signed', 'sizeof', 'static', 'static_cast', 'switch', 'this', 'throw', 'true', 'try', 'typeid', 'union',
    'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while', 'none'
];

/** Invalid operation names */
var opNames = [ 'Struct', 'TypeDef', 'Template' ];

/** The context service */

/** The messaging service */

/** The promise service */

/** The client data model */

/**
 * Set the active view
 *
 * @param {Data} data - The data of the viewModel
 * @param {String} view - The view to be set to
 */
export let setActiveView = function( data, view ) {
    data.activeView = view;
};

/**
 * Set the root object
 *
 * @param {Data} data - The data of the viewModel
 * @param {Selection} selection - The selection
 */
export let setRootObject = function( data, selection ) {
    if( selection.length > 0 ) {
        data.rootSet.push( selection[ 0 ] );
        selection[ 0 ].selected = false;
        exports.setActiveView( data, 'Awp0LogicalObjectSub' );

        data.dataProviders.rootSetProvider.update( data.rootSet );
        data.dataProviders.rootSetProvider.selectNone();
    }
};

/**
 * Remove Root Object
 *
 * @param {Data} data - the data of the ViewModel
 */
export let removeRootObject = function( data ) {
    data.rootSet = [];
    data.dataProviders.rootSetProvider.update( data.rootSet );
};

/**
 * Set the parent object
 *
 * @param {Data} data - The data of the viewModel
 * @param {Selection} selection - The selection
 */
export let setParentObject = function( data, selection ) {
    if( selection.length > 0 ) {
        data.parentSet.push( selection[ 0 ] );
        selection[ 0 ].selected = false;
        exports.setActiveView( data, 'Awp0LogicalObjectSub' );

        data.dataProviders.parentSetProvider.update( data.parentSet );
        data.dataProviders.parentSetProvider.selectNone();
    }
};

/**
 * Remove Parent Object
 *
 * @param {Data} data - the data of the ViewModel
 */
export let removeParentObject = function( data ) {
    data.parentSet = [];
    data.dataProviders.parentSetProvider.update( data.parentSet );
};

/**
 * Get the Logical Object to be selected
 *
 * @return {Object} the Logical Object to be selected
 */
export let getObjectToSelect = function() {
    var ctx = exports.getCtx( 'logicalObject' );
    return ctx && ctx.toSelect && ctx.toSelect.length > 0 ? ctx.toSelect[ 0 ] : null;
};

/**
 * Set the Logical Object to be selected
 *
 * @param {Object} obj - the Logical Object to be selected
 */
export let setObjectToSelect = function( obj ) {
    var ctx = exports.getCtx( 'logicalObject' );
    if( ctx ) {
        ctx.toSelect = obj ? [ obj ] : [];
    }
};

/**
 * Select Logical Object in the list
 *
 * @param {Data} data - the data of the ViewModel
 */
export let selectLogicalObject = function( data ) {
    var obj = exports.getObjectToSelect();

    if( obj ) {
        var provider = data.dataProviders.allListProvider;
        var list = $( 'aw-list[dataprovider="data.dataProviders.allListProvider"]' );
        var scope = list.scope();

        provider.selectNone();
        selectAndScroll( obj, provider, list, scope, 10 );
        exports.setObjectToSelect();
    }
};

/**
 * Validate the logical object
 *
 * @param {Data} data - the data of the ViewModel
 * @return {boolean} true if OK to save, false if params are invalid
 */
export let validate = function( data ) {
    exports.setObjectToSelect();

    if( !/^\w+$/.test( data.internalName.dbValue ) ) {
        showError( data.i18n.nameCharError, [ data.i18n.internalName ] );
        return false;
    }

    if( cppKeywords.indexOf( data.internalName.dbValue ) >= 0 ) {
        showError( data.i18n.nameCppError, [ data.i18n.internalName, data.internalName.dbValue ] );
        return false;
    }

    if( opNames.indexOf( data.internalName.dbValue ) >= 0 ) {
        showError( data.i18n.nameOpError, [ data.i18n.internalName, data.internalName.dbValue ] );
        return false;
    }

    var matched = data.name.dbValue.match( /[<>"'&]/ );
    if( matched && matched.length > 0 ) {
        showError( data.i18n.xmlCharError, [ data.i18n.name, matched[ 0 ] ] );
        return false;
    }

    if( /^\s+|\s+$/.test( data.name.dbValue ) ) {
        showError( data.i18n.trailingSpaceError, [ data.i18n.name ] );
        return false;
    }

    if( /^\s+|\s+$/.test( data.description.dbValue ) ) {
        showError( data.i18n.trailingSpaceError, [ data.i18n.description ] );
        return false;
    }

    if( /[\t]/.test( data.name.dbValue ) ) {
        showError( data.i18n.tabError, [ data.i18n.name ] );
        return false;
    }

    if( /[\t]/.test( data.description.dbValue ) ) {
        showError( data.i18n.tabError, [ data.i18n.description ] );
        return false;
    }

    eventBus.publish( 'awLogicalObject.saveEvent' );
    return true;
};

/**
 * Add a segment into data.segments
 *
 * @param {Data} data - the data of the ViewModel
 * @param {CommandContext} commandContext - the command context
 */
export let addSegment = function( data, commandContext, panelName ) {
    var logicalObjectID = 'IncludedLogicalObjects';

    if( !data.segment && commandContext.segment ) {
        data = commandContext;
    }

    if( data && data.segment && data.segment.props ) {
        if( !data.segments ) {
            data.segments = [];
        }

        setLogicalObject( data );
        setSegmentEnabled( getLastSegment( data ), false );
        setSegmentEditable( data.segment, true );
        setSegmentSource( data );
        setPropertyLabels( data.segment.props.fnd0Direction, data.i18n );

        data.segment.index = data.segments.length;
        data.segment.caption = data.i18n.segment.replace( '{0}', data.segment.index + 1 );
        data.addSegmentCaption = data.i18n.segment.replace( '{0}', data.segment.index + 2 );

        if( panelName === logicalObjectID ) {
            if( data.segment.props.fnd0IncludedLO.dbValue === null ||
                data.segment.props.fnd0IncludedLO.dbValue === undefined ||
                data.segment.props.fnd0IncludedLO.dbValue === false ) {
                data.segment.props.fnd0IncludedLO.dbValue = true;
            }

            if( data.segment.props.fnd0OwningLoTypeName.dbValue === null ||
                data.segment.props.fnd0OwningLoTypeName.dbValue === undefined ||
                data.segment.props.fnd0OwningLoTypeName.dbValue === false ) {
                data.segment.props.fnd0OwningLoTypeName.dbValue = data.logicalObjectInternalName;
            }
        }

        data.segments.push( data.segment );
        setExistingSegment( data );
    }
};

/**
 * Remove a segment from data.segments
 *
 * @param {Data} data - the data of the ViewModel
 */
export let removeSegment = function( data ) {
    if( data.segments && data.segments.length > 1 ) {
        data.addSegmentCaption = data.segments.pop().caption;
        data.segment = getLastSegment( data );
        data.segmentRemoved = true;
        setSegmentEnabled( data.segment, true );
    }
};

/**
 * Clear the current segment
 *
 * @param {Data} data - the data of the ViewModel
 */
export let clearSegment = function( data ) {
    if( data.segment && data.segment.existing ) {
        data.segment.existing = false;
    } else {
        setDbAndUiValue( data.segment.props.fnd0RelationOrReference, '' );
        setDbAndUiValue( data.segment.props.fnd0DestinationType, '' );
        if( data.segment.props.fnd0DestinationCriteria !== undefined ) {
            setDbAndUiValue( data.segment.props.fnd0DestinationCriteria, '' );
        }
    }
};

/**
 * Get the Traversal Path
 *
 * @param {Data} data - the data of the ViewModel
 * @return {Object} the traversal path
 */
export let getTraversalPath = function( data ) {
    var path = [];
    for( var i = 0; i < data.segments.length; i++ ) {
        var seg = data.segments[ i ];
        var relOrRef = seg.props.fnd0RelationOrReference;
        path.push( {
            propertyName: relOrRef.dbValue,
            propertyType: '',
            destinationType: seg.props.fnd0DestinationType.dbValue,
            direction: seg.props.fnd0Direction.dbValue ? 'forward' : 'reverse',
            destinationObjectCriteria: seg.props.fnd0DestinationCriteria.dbValue
        } );
    }
    return path;
};

/**
 * Check for special characters
 *
 * @param {Data} data - the data of the ViewModel
 * @param {idName} data - the name of the Add Panel
 * @param {idValue} data - the Member Id or Logical Object Id
 * @return a boolean if it contains a special character or not.
 */
export let specialCharacterCheck = function( data, idName, idValue ) {
    if( /^[a-zA-Z0-9_]*$/.test( idValue ) === false ) {
        if( idName === 'Add Member' || idName === 'Edit Member' ) {
            showError( data.i18n.addEntryMemberSpecialCharacterError );
        } else if( idName === 'Add Included Logical Object' ) {
            showError( data.i18n.addEntryLogicalObjectSpecialCharacterError );
        }
        return false;
    }

    if( idName === 'Add Member' ) {
        eventBus.publish( 'awLogicalObject.addMemberEvent' );
    } else if( idName === 'Add Included Logical Object' ) {
        eventBus.publish( 'awLogicalObject.addIncludedLogicalObjectEvent' );
    } else if( idName === 'Edit Member' ) {
        eventBus.publish( 'awLogicalObject.saveMember' );
    }

    return true;
};

/**
 * Add property definition
 *
 * @param {Data} data - the data of the ViewModel
 */
export let addPropDef = function( data ) {
    var propTypeName = '';
    if( data && data.propDef ) {
        setLogicalObject( data );
        data.propDef.props.fnd0RootOrMemberID.isEditable = true;
        data.propDef.props.fnd0MemberProperties.isEditable = true;

        if( data && data.logicalObject && data.logicalObject.props && data.logicalObject.props.type_name ) {
            propTypeName = getDbValue( data.logicalObject.props.type_name );
        }
        data.propDef.props.fnd0OwningType.dbValue = data.logicalObject ? propTypeName : '';
        data.propDef.props.fnd0OwningType.isEditable = true;
        data.propDef.props.fnd0OwningType.valueUpdated = true;
    }
};

/**
 * Update property definition
 *
 * @param {Data} data - the data of the ViewModel
 */
export let updatePropDef = function( data ) {
    if( data && data.propDef ) {
        data.propDef.props.fnd0MemberProperties.dbValue = [];
        data.propDef.props.fnd0MemberProperties.displayValsModel = [];
        data.propDef.props.fnd0MemberProperties.displayValues = [];
    }
};

/**
 * Get property definitions
 *
 * @param {Data} data - the data of the ViewModel
 * @return {Object} the property definitions
 */
export let getPropDefs = function( data ) {
    var rootOrMember = data.propDef.props.fnd0RootOrMemberID;
    var memberProp = data.propDef.props.fnd0MemberProperties;

    var id = rootOrMember.dbValue;
    var props = memberProp.dbValue;
    data.propDef0 = { presentedPropertyName: id + '_' + props[ 0 ] };
    data.propDefs = [];

    for( var i = 0; i < props.length; i++ ) {
        var prop = props[ i ];

        if( !propExist( data.propDefs, prop ) ) {
            data.propDefs.push( {
                rootOrMemberName: id,
                sourcePropertyName: prop,
                presentedPropertyName: '',
                displayName: ''
            } );
        }
    }

    return data.propDefs;
};

/**
 * Confirm delete selected logical object, members, or presented properties
 *
 * @param {Object} data - the data in ViewModel
 * @returns {Promise} the promise
 */
export let confirmDeleteLogicalObject = function( data ) {
    var deferred = AwPromiseService.instance.defer();

    setLogicalObject( data );
    setMembersOrProps( data );

    if( data.logicalObject ) {
        if( data.membersOrProps.length === 0 ) {
            data.toDelete = '"' + data.logicalObjectName + '"';
        } else if( data.membersOrProps.length === 1 ) {
            data.toDelete = '"' + data.membersOrProps[ 0 ] + '"';
        } else {
            data.toDelete = data.i18n.selections.replace( '{0}', data.membersOrProps.length );
        }

        showDeleteWarning( data, deferred );
    }

    return deferred.promise;
};

/**
 * Get the context
 *
 * @param {String} ctxName - the context name
 * @return {Object} the context
 */
export let getCtx = function( ctxName ) {
    return appCtxSvc.getCtx( ctxName );
};

/**
 * Search LogicalObject
 *
 * @param {String} searchString - the search string
 */
export let searchLogicalObject = function( searchString ) {
    var ctx = exports.getCtx( 'search' );
    if( ctx && ctx.criteria ) {
        ctx.criteria.searchString = searchString;
    }

    eventBus.publish( 'primaryWorkarea.reset' );
};

/**
 * Select the default Logical Object
 *
 * @param {Object} data - the data
 */
export let selectDefault = function( data ) {
    var provider = data.dataProviders.parentListProvider;
    if( provider ) {
        var list = provider.viewModelCollection.getLoadedViewModelObjects();
        for( var i = 0; i < list.length; i++ ) {
            if( list[ i ].props.type_name.dbValues[ 0 ] === 'Fnd0LogicalObject' ) {
                provider.selectionModel.setSelection( list[ i ] );
            }
        }
    }
};

/**
 * Update Destination Type and/or Destination Criteria
 * if RelationOrReference LOV Value is changed
 *
 * @param {Data} data - the data of the ViewModel
 */
export let updateDestTypeAndCriteria = function( data ) {
    if( data && data.segment ) {
        if( data.segment.props.fnd0Direction.dbValue ) {
            if( data.segment.props.fnd0DestinationType !== undefined && data.segment.props.fnd0DestinationType.valueUpdated === true ) {
                setDbAndUiValue( data.segment.props.fnd0DestinationType, '' );
            }

            if( data.segment.props.fnd0DestinationCriteria !== undefined && data.segment.props.fnd0DestinationCriteria.valueUpdated === true ) {
                setDbAndUiValue( data.segment.props.fnd0DestinationCriteria, '' );
            }
        }
    }
};

/**
 * Update Destination Criteria if DestinationType LOV Value is changed
 *
 * @param {Data} data - the data of the ViewModel
 */
export let updateRelOrRefAndDestCriteria = function( data ) {
    if( data && data.segment ) {
        if( data.segment.props.fnd0Direction.dbValue ) {
            if( data.segment.props.fnd0DestinationCriteria !== undefined && data.segment.props.fnd0DestinationCriteria.valueUpdated === true ) {
                setDbAndUiValue( data.segment.props.fnd0DestinationCriteria, '' );
            }
        } else {
            if( data.segment.props.fnd0RelationOrReference !== undefined && data.segment.props.fnd0RelationOrReference.valueUpdated === true ) {
                setDbAndUiValue( data.segment.props.fnd0RelationOrReference, '' );
            }

            if( data.segment.props.fnd0DestinationCriteria !== undefined && data.segment.props.fnd0DestinationCriteria.valueUpdated === true ) {
                setDbAndUiValue( data.segment.props.fnd0DestinationCriteria, '' );
            }
        }
    }
};

/**
 * Get the member definition map
 *
 * @param {Object} data - the data
 * @return {Object} the member definition map
 */
export let getMemberDefMap = function( data ) {
    var map = {};
    var selected = exports.getCtx( 'selected' );
    if( data.logicalObject && selected && selected.props.fnd0TraversalSegments ) {
        map[ selected.props.fnd0PropertyName.dbValue ] = {
            memberPropertyName: data.memberId.dbValue,
            displayName: data.displayName.dbValue,
            retrieveClassificationData: data.retrieveClassificationData.dbValue,
            traversalPath: exports.getTraversalPath( data )
        };
    }

    return map;
};

/**
 * Show error message with optional params
 *
 * @param {Sting} message - the message
 * @param {String} params - optional params
 */
function showError( message, params ) {
    var msg = message;
    if( params && params.length > 0 ) {
        for( var i = 0; i < params.length; i++ ) {
            msg = msg.replace( '{' + i + '}', params[ i ] );
        }
    }

    msgService.showError( msg );
}

/**
 * Show delete warning message
 *
 * @param {Object} data - the data
 * @param {Object} deferred - the deferred
 */
function showDeleteWarning( data, deferred ) {
    var msg = data.i18n.deleteConfirmation.replace( '{0}', data.toDelete );
    data.confirmDelete = '';
    var buttons = [ {
        addClass: 'btn btn-notify',
        text: data.i18n.cancel,
        onClick: function( $noty ) {
            $noty.close();
            deferred.resolve( data.confirmDelete = false );
        }
    }, {
        addClass: 'btn btn-notify',
        text: data.i18n.delete,
        onClick: function( $noty ) {
            $noty.close();
            deferred.resolve( data.confirmDelete = true );
        }
    } ];
    msgService.showWarning( msg, buttons );
}

/**
 * Find the index of the logical object in the data provider
 *
 * @param {Object} obj - the logical object
 * @param {Object} provider - the list data provider
 * @return {Number} the index, or -1 if not found
 */
function findIndexInDataProvider( obj, provider ) {
    var list = provider.viewModelCollection.getLoadedViewModelObjects();

    for( var i = 0; i < list.length; i++ ) {
        if( obj.uid === list[ i ].uid ) {
            return i;
        }
    }

    return -1;
}

/**
 * Select object and scroll into view, get next page if needed
 *
 * @param {Object} obj - the object to be scrolled into view
 * @param {Object} provider - the data provider
 * @param {Object} list - the list element
 * @param {Object} scope - the scope
 * @param {Number} count - count of remaining recursive calls
 */
function selectAndScroll( obj, provider, list, scope, count ) {
    var index = findIndexInDataProvider( obj, provider );
    var li = list.find( 'li' )[ index ];
    if( li ) {
        li.scrollIntoView();
        provider.changeObjectsSelection( index, index, true );
    } else if( count > 0 ) {
        var totalLoaded = provider.viewModelCollection.getTotalObjectsLoaded();
        var totalFound = provider.viewModelCollection.getTotalObjectsFound();

        if( totalLoaded < totalFound ) {
            provider.getNextPage( scope );
            // .then( function ) sometimes not called, so do not rely on it
        }
        window.setTimeout( function() { selectAndScroll( obj, provider, list, scope, count - 1 ); }, 200 );
    }
}

/**
 * Set the segment as editable or not
 *
 * @param {Segment} segment - the segment
 * @param {boolean} editable - set as editable or not
 */
function setSegmentEditable( segment, editable ) {
    if( segment ) {
        segment.props.fnd0Direction.isEditable = editable;
        segment.props.fnd0RelationOrReference.isEditable = editable;
        segment.props.fnd0DestinationType.isEditable = editable;
        segment.props.fnd0DestinationCriteria.isEditable = editable;
    }
}

/**
 * Set the segment as enabled or not
 *
 * @param {Segment} segment - the segment
 * @param {boolean} enabled - set as enabled or not
 */
function setSegmentEnabled( segment, enabled ) {
    if( segment ) {
        segment.props.fnd0Direction.isEnabled = enabled;
        segment.props.fnd0RelationOrReference.isEnabled = enabled;
        segment.props.fnd0DestinationType.isEnabled = enabled;
        if( segment.props.fnd0DestinationCriteria !== undefined ) {
            segment.props.fnd0DestinationCriteria.isEnabled = enabled;
        }
    }
}

/**
 * Set the property labels
 *
 * @param {Object} prop - the property
 * @param {Object} i18n - the i18n object
 */
function setPropertyLabels( prop, i18n ) {
    if( prop ) {
        prop.dbValue = true;
        prop.propertyLabelDisplay = 'PROPERTY_LABEL_AT_RIGHT';
        prop.propertyRadioTrueText = i18n.forward;
        prop.propertyRadioFalseText = i18n.backward;
    }
}

/**
 * Get the last segment
 *
 * @param {Data} data - the data of the ViewModel
 * @returns {Segment} the last segment
 */
function getLastSegment( data ) {
    if( data.segments && data.segments.length > 0 ) {
        return data.segments[ data.segments.length - 1 ];
    }
    return null;
}

/**
 * Set the segment source
 *
 * @param {Object} data - the data of the ViewModel
 */
function setSegmentSource( data ) {
    var lastSeg = getLastSegment( data );

    data.segment.props.fnd0SourceType.dbValue = lastSeg ? lastSeg.props.fnd0DestinationType.dbValue :
        data.logicalObject ? getDbValue( data.logicalObject.props.fnd0RootTypeName ) : '';

    if( data.segment.props.fnd0SourceType && ( data.segment.props.fnd0SourceType.valueUpdated === false ||
            data.segment.props.fnd0SourceType.valueUpdated === undefined ) ) {
        data.segment.props.fnd0SourceType.valueUpdated = true;
    }

    if( data.segment.props.fnd0Direction && ( data.segment.props.fnd0Direction.valueUpdated === false ||
            data.segment.props.fnd0Direction.valueUpdated === undefined ) ) {
        data.segment.props.fnd0Direction.valueUpdated = true;
    }

    if( data.segment.props.fnd0IncludedLO && ( data.segment.props.fnd0IncludedLO.valueUpdated === false ||
            data.segment.props.fnd0IncludedLO.valueUpdated === undefined ) ) {
        data.segment.props.fnd0IncludedLO.valueUpdated = true;
    }

    if( data.segment.props.fnd0OwningLoTypeName && ( data.segment.props.fnd0OwningLoTypeName.valueUpdated === false ||
            data.segment.props.fnd0OwningLoTypeName.valueUpdated === undefined ) ) {
        data.segment.props.fnd0OwningLoTypeName.valueUpdated = data.logicalObjectInternalName;
    }
}

/**
 * Set the current logical object
 *
 * @param {Object} data - the data of the ViewModel
 */
function setLogicalObject( data ) {
    var selected = exports.getCtx( 'selected' );
    var logicalObjectNameSplit = '';
    if( !( selected && selected.props.fnd0RootTypeName ) ) {
        selected = exports.getCtx( 'pselected' );
    }

    //check if the selected LO object's display string contains (Root:<internal name>)
    if( selected && selected.props ) {
        data.logicalObject = selected;

        if( selected.props.object_string ) {
            logicalObjectNameSplit = getDbValue( selected.props.object_string );
            var openBracketIndex = logicalObjectNameSplit.indexOf( '(' );
            if( openBracketIndex !== -1 ) {
                logicalObjectNameSplit = logicalObjectNameSplit.substring( 0, openBracketIndex ).trim();
            }
        }

        data.logicalObjectName = selected ? logicalObjectNameSplit : '';

        if( selected.props.fnd0InternalName && selected.props.fnd0InternalName.dbValues ) {
            data.logicalObjectInternalName = selected.props.fnd0InternalName.dbValues;
        }
    }
}

/**
 * Set multiselected members or presented properties
 *
 * @param {Object} data - the data of the ViewModel
 */
function setMembersOrProps( data ) {
    var list = [];
    var selected = exports.getCtx( 'selected' );
    var mselected = exports.getCtx( 'mselected' );
    var rowId = getRowId( selected );

    if( rowId ) {
        list.push( rowId );
    }

    if( mselected ) {
        for( var i = 0; i < mselected.length; i++ ) {
            rowId = getRowId( mselected[ i ] );
            if( rowId && list.indexOf( rowId ) === -1 ) {
                list.push( rowId );
            }
        }
    }

    data.membersOrProps = list;
}

/**
 * Get row ID, can be either fnd0PropertyName or fnd0PresentedPropID
 *
 * @param {Object} row - the selected row
 * @returns {Object} the row ID, or null if not exist
 */
function getRowId( row ) {
    if( row && row.props ) {
        return row.props.fnd0PropertyName ? getDbValue( row.props.fnd0PropertyName ) :
            row.props.fnd0PresentedPropID ? getDbValue( row.props.fnd0PresentedPropID ) : null;
    }

    return null;
}

/**
 * Check if a property name already exists in propDefs
 *
 * @param {Object} propDefs - the propDefs
 * @param {String} propName - the property name
 * @returns {Boolean} true if exist
 */
function propExist( propDefs, propName ) {
    for( var i = 0; i < propDefs.length; i++ ) {
        if( propDefs[ i ].sourcePropertyName === propName ) {
            return true;
        }
    }

    return false;
}

/**
 * Get the property dbValue or dbValues[0] even if one of them not exist
 *
 * @param {Object} prop - the property
 * @return {String} the dbValue or dbValues[0]
 */
function getDbValue( prop ) {
    return prop.dbValues && prop.dbValues.length > 0 ? prop.dbValues[ 0 ] : prop.dbValue;
}

/**
 * set the segment from existing data
 *
 * @param {Object} data - the data
 */
function setExistingSegment( data ) {
    var selected = exports.getCtx( 'selected' );

    if( data.logicalObject && selected && selected.props.fnd0TraversalSegments ) {
        if( data.segment.index === 0 ) {
            data.caption = data.i18n.editMember;
            data.memberId.dbValue = selected.props.fnd0PropertyName.dbValue;
            data.displayName.dbValue = selected.props.fnd0PropertyDisplayName.dbValue;
            data.retrieveClassificationData.dbValue = selected.props.fnd0GetMemberICOData.dbValue;
            data.existingSegmentCount = selected.props.fnd0TraversalSegments.dbValues.length;
        }

        if( data.existingSegmentCount > 0 ) {
            var seg = selected.props.fnd0TraversalSegments.dbValues[ data.segment.index ];
            if( typeof seg === 'string' || seg instanceof String ) {
                seg = cdm.getObject( seg );
            }
            data.segment.props.fnd0Direction.dbValue = getDbValue( seg.props.fnd0Direction ) === '1';
            setDbAndUiValue( data.segment.props.fnd0RelationOrReference, getDbValue( seg.props.fnd0RelationOrReference ) );
            setDbAndUiValue( data.segment.props.fnd0DestinationType, getDbValue( seg.props.fnd0DestinationType ) );
            setDbAndUiValue( data.segment.props.fnd0DestinationCriteria, getDbValue( seg.props.fnd0DestinationCriteria ) );
            data.segment.props.fnd0RelationOrReference.valueUpdated = true;
            data.segment.props.fnd0DestinationType.valueUpdated = true;
            data.segment.props.fnd0DestinationCriteria.valueUpdated = true;
            data.segment.existing = true;

            if( --data.existingSegmentCount > 0 ) {
                eventBus.publish( 'awLogicalObject.createSegment' );
            }
        }
    }
}

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


eventBus.subscribe( 'editHandlerStateChange', function( context ) {
    if( context.state === 'saved' && context.dataSource.fnd0RootTypeName ) {
        eventBus.publish( 'cdm.relatedModified', {
            relatedModified: [ context.dataSource.vmo ]
        } );
    }
} );

export default exports = {
    setActiveView,
    setRootObject,
    removeRootObject,
    setParentObject,
    removeParentObject,
    getObjectToSelect,
    setObjectToSelect,
    selectLogicalObject,
    validate,
    addSegment,
    removeSegment,
    clearSegment,
    getTraversalPath,
    specialCharacterCheck,
    addPropDef,
    updatePropDef,
    getPropDefs,
    confirmDeleteLogicalObject,
    getCtx,
    searchLogicalObject,
    selectDefault,
    updateDestTypeAndCriteria,
    updateRelOrRefAndDestCriteria,
    getMemberDefMap
};
/**
 * This factory creates service to listen to subscribe to the event when templates are loaded
 *
 * @memberof NgServices
 * @member Awp0NewWorkflowProcess
 */
app.factory( 'Awp0LogicalObjectService', () => exports );
