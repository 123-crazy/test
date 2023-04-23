/* eslint-disable max-lines */
// Copyright (c) 2020 Siemens

/**
 * This module defines the primary classes used to manage the 'aw-table' directive (used by decl grid).
 *
 * DOM Structure:
 * - Cell Command
 *     CLASS_CELL|ui-grid-cell
 *       CLASS_TABLE_CELL_TOP|aw-splm-tableCellTop
 *         ( Content in CLASS_TABLE_CELL_TOP for all case above )
 *         CLASS_AW_CELL_COMMANDS|aw-jswidgets-gridCellCommands --> Custom command cell if exist
 *         CLASS_NATIVE_CELL_COMMANDS|aw-splm-tableGridCellCommands --> OOTB command cell, check mark
 *
 *
 * - Object/Object List:
 *     CLASS_CELL|ui-grid-cell
 *       CLASS_TABLE_NON_EDIT_CELL_LIST|aw-jswidgets-arrayNonEditValueCellList  --> ( <ul>, CLASS_TABLE_CELL_TOP )
 *         CLASS_TOOLTIP_POPUP|aw-splm-tableTooltipPopup
 *         CLASS_TABLE_NON_EDIT_CELL_LIST_ITEM|aw-jswidgets-arrayValueCellListItem --> ( <li> )
 *           CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS|aw-splm-tablePropertyValueLinks --> ( <a>, innerHTML from addHighlights )
 *           CLASS_AW_OLD_TEXT|aw-jswidgets-oldText --> ( <div>, innerHTML from addHighlights )
 *
 *
 * - Rich Text/Rich Text List:
 *     CLASS_CELL|ui-grid-cell
 *       CLASS_TABLE_NON_EDIT_CELL_LIST|aw-jswidgets-arrayNonEditValueCellList  --> ( <ul>, CLASS_TABLE_CELL_TOP )
 *         CLASS_TOOLTIP_POPUP|aw-splm-tableTooltipPopup
 *         CLASS_TABLE_NON_EDIT_CELL_LIST_ITEM|aw-jswidgets-arrayValueCellListItem  --> ( <li> )
 *           CLASS_TABLE_RTF_CELL_ITEM|aw-splm-tableRTFCellItem ( <div>, innerHTML from addHighlights )
 *           CLASS_AW_OLD_TEXT|aw-jswidgets-oldText --> ( <div>, innerHTML from addHighlights )
 *
 *
 * - Changed Text/Text List:
 *     CLASS_CELL|ui-grid-cell
 *       CLASS_TABLE_NON_EDIT_CELL_LIST|aw-jswidgets-arrayNonEditValueCellList  --> ( <ul>, CLASS_TABLE_CELL_TOP )
 *         CLASS_TOOLTIP_POPUP|aw-splm-tableTooltipPopup
 *         CLASS_TABLE_NON_EDIT_CELL_LIST_ITEM|aw-jswidgets-arrayValueCellListItem --> ( <li> )
 *           CLASS_WIDGET_TABLE_CELL_TEXT|aw-splm-tableCellText --> ( <div>, innerHTML from addHighlights )
 *           CLASS_AW_OLD_TEXT|aw-jswidgets-oldText --> ( <div>, innerHTML from addHighlights )
 *
 * - Text:
 *     CLASS_CELL|ui-grid-cell
 *       CLASS_TABLE_CELL_TOP|aw-splm-tableCellTop --> ( <div> )
 *         CLASS_WIDGET_TABLE_CELL_TEXT|aw-splm-tableCellText --> ( <div>, innerHTML from addHighlights )
 *
 *
 * @module js/awSPLMTableCellRendererFactory
 */
import app from 'app';
import sanitizer from 'js/sanitizer';
import appCtxService from 'js/appCtxService';
import commandService from 'js/command.service';
import clickableTitleService from 'js/clickableTitleService';
import awIconService from 'js/awIconService';
import cdm from 'soa/kernel/clientDataModel';
import AwHttpService from 'js/awHttpService';
import AwPromiseService from 'js/awPromiseService';
import AwCacheFactoryService from 'js/awCacheFactoryService';
import navigationTokenService from 'js/navigationTokenService';
import _ from 'lodash';
import _t from 'js/splmTableNative';
import eventBus from 'js/eventBus';
import cfgSvc from 'js/configurationService';
import declUtils from 'js/declUtils';
import 'js/awColumnService';
import 'js/viewModelObjectService';
import 'js/declModelRegistryService';
import 'js/uwPropertyService';
import 'js/aw-table-command-bar.directive';

var exports = {};

let highlighter;

var _propVsRenderingTemplate;
var _defaultRenderingTemplates = {};

/**
 * Method to render rows
 *
 * @param {Number} startIndex Start render index
 * @param {Number} endIndex End render Index
 */
function generatePropRendererTemplateMap() {
    _propVsRenderingTemplate = {};
    var _contributedTemplates = cfgSvc.getCfgCached( 'propertyRendererTemplates' );
    _.forEach( _contributedTemplates, function( contributedTemplate ) {
        if( !_.isEmpty( contributedTemplate.headerTemplate ) || !_.isEmpty( contributedTemplate.headerTemplateUrl ) || !_.isEmpty( contributedTemplate.headerRenderFunction ) ) {
            contributedTemplate.isHeaderTemplate = true;
        }
        if( !_.isEmpty( contributedTemplate.template ) || !_.isEmpty( contributedTemplate.templateUrl ) || !_.isEmpty( contributedTemplate.renderFunction ) ) {
            contributedTemplate.isCellTemplate = true;
        }

        var isDefaultTemplate = false;
        if( _.isEmpty( contributedTemplate.grids ) ) {
            // default rendering template for property
            isDefaultTemplate = true;
        }
        // Get ModelTypes for this Indicator Json
        if( _.isEmpty( contributedTemplate.columns ) ) {
            _.forEach( contributedTemplate.grids, function( gridid ) {
                _defaultRenderingTemplates[ gridid ] = contributedTemplate;
            } );
        }
        _.forEach( contributedTemplate.columns, function( column ) {
            if( !_propVsRenderingTemplate[ column ] ) {
                _.set( _propVsRenderingTemplate, [ column ], { specificRenderingTemplates: [], defaultPropRenderingTemplate: {} } );
            }
            var renderingTemplatesForProp = _propVsRenderingTemplate[ column ];
            if( isDefaultTemplate ) {
                _.set( renderingTemplatesForProp, 'defaultPropRenderingTemplate', contributedTemplate );
            } else {
                renderingTemplatesForProp.specificRenderingTemplates.push( contributedTemplate );
            }
        } );
    } );
}

var applyCommandCellScope = function( cellCmdElem, column, vmo, extraDigest ) {
    var scope = _t.util.getElementScope( cellCmdElem );
    scope.anchor = column.commandsAnchor;
    scope.commandContext = {
        vmo: vmo
    };

    if( vmo.props !== undefined ) {
        scope.prop = vmo.props[ column.field ];
    }

    if( extraDigest ) {
        scope.$evalAsync();
    }
};

var createCompiledCellCommandElement = function( tableElem ) {
    var commandBarHtml =
        '<div class="aw-jswidgets-gridCellCommands aw-widgets-cellInteraction" ng-show="!prop.isPropInEdit||prop.isArray">' + //
        '<div class="aw-layout-flexColumn aw-splm-commandBarPresent aw-splm-tableFlexRow">' + //
        '<aw-table-command-bar ng-if="anchor" anchor="{{anchor}}" context="commandContext" ' + //
        'class="aw-layout-flexRow"></aw-table-command-bar>' + //
        '</div>' + //
        '</div>';

    var cellScope = {};
    return _t.util.createNgElement( commandBarHtml, tableElem, cellScope );
};

const getTreeIconCellId = function( vmo ) {
    if( vmo.loadingStatus ) {
        return 'miscInProcessIndicator';
    } else if( vmo.isLeaf ) {
        return 'typeBlankIcon';
    } else if( vmo.isExpanded ) {
        return 'miscExpandedTree';
    }
    return 'miscCollapsedTree';
};

/**
 * Creates the Icon cell for tree command cell.
 *
 * @param {DOMElement} tableElem tree table element
 * @param {Object} vmo the vmo for the cell
 *
 * @returns {DOMElement} icon element
 */
var createIconElement = function( tableElem, vmo ) {
    var treeCellButtonHeaderCell = _t.util.createElement( 'div', _t.Const.CLASS_TREE_ROW_HEADER_BUTTONS, _t.Const.CLASS_TREE_BASE_HEADER );
    if( !vmo.isLeaf ) {
        treeCellButtonHeaderCell.classList.add( _t.Const.CLASS_WIDGET_TREE_NODE_TOGGLE_CMD );
        treeCellButtonHeaderCell.tabIndex = -1;
        tableElem._tableInstance.keyboardService.setOnFocusAndBlur( treeCellButtonHeaderCell );
    }
    var treeIndent = 16;
    treeCellButtonHeaderCell.style.marginLeft = treeIndent * vmo.levelNdx + 'px';

    var iconContainerElement = _t.util.createElement( 'aw-icon' );
    const iconCellId = getTreeIconCellId( vmo );
    iconContainerElement = _t.util.addAttributeToDOMElement( iconContainerElement, 'icon-id', iconCellId );
    iconContainerElement.title = vmo._twistieTitle;

    var iconHTML = awIconService.getIconDef( iconCellId );
    iconContainerElement.innerHTML = iconHTML;

    treeCellButtonHeaderCell.appendChild( iconContainerElement );

    return treeCellButtonHeaderCell;
};

/**
 * Creates the cell decorator element for tree command cell.
 *
 * @param {DOMElement} tableElem tree table element
 * @param {Object} vmo the vmo for the cell
 *
 * @returns {DOMElement} cell decorator element
 */
var createCellDecoratorElement = function( tableElem, vmo ) {
    var cellColorContainerElement = _t.util.createElement( 'div', _t.Const.CLASS_GRID_CELL_COLOR_CONTAINER, _t.Const.CLASS_TREE_COLOR_CONTAINER );
    var cellColorElement = _t.util.createColorIndicatorElement( vmo );
    cellColorContainerElement.appendChild( cellColorElement );

    return cellColorContainerElement;
};

/**
 * Get the img element tag alt text for WCAG accessibility compliance
 * @param {Object} vmo - View model object
 * @returns {String} Returns alt text
 */
var getImageAltText = function( vmo ) {
    if( vmo.hasThumbnail ) {
        return vmo.cellHeader1;
    } else if( vmo.props && vmo.props.object_type && vmo.props.object_type.uiValue ) {
        return vmo.props.object_type.uiValue;
    }
    return vmo.modelType && vmo.modelType.displayName ? vmo.modelType.displayName : '';
};

/**
 * Creates the cell image element for tree command cell.
 *
 * @param {DOMElement} tableElem tree table element
 * @param {Object} vmo the vmo for the cell
 *
 * @returns {DOMElement} cell image element
 */
var createCellImageElement = function( tableElem, vmo ) {
    let imgURL = _t.util.getImgURL( vmo );
    if( imgURL === '' ) {
        return null;
    }

    let cellImageContainerElement = _t.util.createElement( 'div', _t.Const.CLASS_GRID_CELL_IMAGE );
    let cellImageElement = _t.util.createElement( 'img', _t.Const.CLASS_ICON_BASE );
    cellImageElement.src = imgURL;
    cellImageElement.alt = getImageAltText( vmo );
    cellImageContainerElement.appendChild( cellImageElement );
    return cellImageContainerElement;
};

var toggleTreeCellAction = function( vmo, tableElem, treeCellElement ) {
    if( vmo.isExpanded || vmo.isInExpandBelowMode ) {
        // collapse
        delete vmo.isExpanded;
        vmo.isInExpandBelowMode = false;
    } else {
        vmo.isExpanded = true;
        // Set icon cell to loading icon
        var iconContainerElement = treeCellElement.getElementsByTagName( _t.Const.ELEMENT_AW_ICON )[ 0 ];
        if( iconContainerElement !== undefined ) {
            var iconHTML = awIconService.getIconDef( 'miscInProcessIndicator' );
            iconContainerElement.innerHTML = iconHTML;
        }
    }
    // Prevent the selected row from being scrolled to if it goes out of view
    eventBus.publish( tableElem.id + '.plTable.unsetScrollToRowIndex' );
    eventBus.publish( tableElem.id + '.plTable.toggleTreeNode', vmo );
};

var populateHrefContentPerPropValue = function( objectElement, scope, uidToBeEvaluated, vmo ) {
    var deferred = AwPromiseService.instance.defer();
    if( objectElement && scope && uidToBeEvaluated ) {
        navigationTokenService.getNavigationContent( scope, uidToBeEvaluated, vmo ).then( function( urlDetails ) {
            var hrefDetails = urlDetails;
            if( hrefDetails ) {
                deferred.resolve( { objectElement: objectElement, url: hrefDetails } );
            }
        } );
    }
    return deferred.promise;
};

var addHrefToAnchorLink = function( objectElement, scope, uidToBeEvaluated, vmo ) {
    objectElement.addEventListener( 'mouseenter', function() {
        populateHrefContentPerPropValue( objectElement, scope, uidToBeEvaluated, vmo ).then( function( response ) {
            if( !_.isUndefined( response ) ) {
                objectElement = _t.util.addAttributeToDOMElement( response.objectElement, 'href', response.url.urlContent );
                objectElement = _t.util.addAttributeToDOMElement( objectElement, 'target', response.url.target );
            }
        } );
    } );
    return objectElement;
};

var addClickableCellTitle = function( element, vmo, value, tableElem ) {
    // make cell text clickable
    var clickableTextDiv = _t.util.createElement( 'div' );
    var clickableText = _t.util.createElement( 'a', 'aw-uiwidgets-clickableTitle' );
    var scope = _t.util.getElementScope( tableElem.parentElement, true );

    clickableText.onclick = function( event ) {
        scope.vmo = vmo;
        clickableTitleService.doIt( event, scope );
    };

    clickableText.innerHTML = exports.addHighlights( value );
    clickableTextDiv.appendChild( clickableText );
    element.appendChild( clickableTextDiv );
};

/**
 * Creates the title and command container element for tree command cell.
 *
 * @param {DOMElement} tableElem tree table element
 * @param {Object} vmo the vmo for the cell
 * @param {Object} column the column associated with the cell
 *
 * @returns {DOMElement} title/command container element
 */
let createTitleElement = function( tableElem, vmo, column ) {
    let tableNonEditContainerElement = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_NON_EDIT_CONTAINER,
        _t.Const.CLASS_LAYOUT_ROW_CONTAINER );
    let displayName = vmo.displayName;
    tableNonEditContainerElement.title = displayName;

    let parsedValue = sanitizer.htmlEscapeAllowEntities( displayName, true, true );
    let gridCellText = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT );

    if( ( column.isTableCommand || column.isTreeNavigation ) && clickableTitleService.hasClickableCellTitleActions() ) {
        addClickableCellTitle( gridCellText, vmo, parsedValue, tableElem );
    } else {
        gridCellText.innerHTML = exports.addHighlights( parsedValue );
    }

    const dynamicRowHeightEnabled = tableElem && tableElem._tableInstance.dynamicRowHeightStatus;
    if( dynamicRowHeightEnabled ) {
        tableNonEditContainerElement.classList.add( _t.Const.CLASS_TABLE_CELL_TOP_DYNAMIC );
        gridCellText.classList.add( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT_DYNAMIC );
    }

    tableNonEditContainerElement.appendChild( gridCellText );

    return tableNonEditContainerElement;
};

/**
 * Show or hide the element based on 'isSelected'.
 *
 * @param {DOMElement} element DOM element to show/hide
 * @param {Boolean} isSelected used to either show or hide element
 */
var toggleCellCommandVisibility = function( element, isSelected ) {
    if( isSelected ) {
        _t.util.showHideElement( element, false );
    } else {
        _t.util.showHideElement( element, true );
    }
};

/**
 * Add events to the tree command cell elements.
 *
 * @param {DOMElement} treeCellElement tree cell container element
 * @param {Object} vmo the vmo for the cell
 * @param {DOMElement} tableElem table element
 */
var addTreeCommandCellEvents = function( treeCellElement, vmo, tableElem ) {
    var tableInstance = _t.util.getTableInstance( tableElem );
    var dataProviderName = tableInstance.dataProvider.name;

    var treeCellButtonElement = treeCellElement.getElementsByClassName( _t.Const.CLASS_TREE_ROW_HEADER_BUTTONS )[ 0 ];
    if( treeCellButtonElement ) {
        const treeCommandCellClickListener = function() {
            if( !vmo.isLeaf && _t.util.isExpandAllowed( tableElem ) ) {
                toggleTreeCellAction( vmo, tableElem, treeCellElement );
            }
        };
        treeCellButtonElement.addEventListener( 'click', treeCommandCellClickListener );
        treeCellButtonElement.addEventListener( 'keydown', function( event ) {
            if( event.code === 'Enter' || event.code === 'Space' ) {
                treeCommandCellClickListener();
            }
        } );
    }

    var treeCellImageElement = treeCellElement.getElementsByClassName( _t.Const.CLASS_GRID_CELL_IMAGE )[ 0 ];
    if( treeCellImageElement ) {
        treeCellImageElement.addEventListener( 'click', function() {
            eventBus.publish( 'plTable.imageButtonClick', vmo );
        } );
    }

    var cellCommandBarElement = treeCellElement.getElementsByClassName( 'cellCommandBarContainer' )[ 0 ];
    if( cellCommandBarElement ) {
        var isSelected = tableInstance.dataProvider.selectionModel.multiSelectEnabled && vmo.selected;
        toggleCellCommandVisibility( cellCommandBarElement, isSelected );

        eventBus.subscribe( dataProviderName + '.selectionChangeEvent', function() {
            isSelected = tableInstance.dataProvider.selectionModel.multiSelectEnabled && vmo.selected;
            toggleCellCommandVisibility( cellCommandBarElement, isSelected );
        } );
    }
};

/**
 * @memberOf js/awSPLMTableCellRendererFactory
 *
 * This method is used for creating cell commands internall for PL Table in AW usecase.
 *
 * @param {Object} column - column Definition
 * @param {Object} vmo - View model object
 * @param {DOMElement} tableElem - table DOMElement as context
 * @param {Boolean} [isInternal] - true if function being called from internal PL Table code
 * @param {Boolean} [extraDigest] - true if one extra digest is needed
 * @returns {DOMElement} DOMElement presents cell command bar
 *
 */
var createCellCommandElementInternal = function( column, vmo, tableElem, isInternal, extraDigest ) {
    var elem = createCompiledCellCommandElement( tableElem );
    if( isInternal ) {
        elem.classList.add( _t.Const.CLASS_NATIVE_CELL_COMMANDS );
    }
    applyCommandCellScope( elem, column, vmo, extraDigest );
    return elem;
};

/**
 * @memberOf js/awSPLMTableCellRendererFactory
 *
 * This method is used for creating cell commands for PL Table in AW usecase.
 *
 * @param {Object} column - column Definition
 * @param {Object} vmo - View model object
 * @param {DOMElement} tableElem - table DOMElement as context
 * @param {Boolean} [isInternal] - true if function being called from internal PL Table code
 * @returns {DOMElement} DOMElement presents cell command bar
 *
 */
export let createCellCommandElement = function( column, vmo, tableElem, isInternal ) {
    return createCellCommandElementInternal( column, vmo, tableElem, isInternal );
};

export let createTreeCellCommandElement = function( column, vmo, tableElem ) {
    // CELL CONTAINER
    var tableTreeCommandCell = _t.util.createElement( 'div', _t.Const.CLASS_AW_TREE_COMMAND_CELL, _t.Const.CLASS_WIDGET_TABLE_CELL );
    var treeCellTop = _t.util.createElement( 'div', _t.Const.CLASS_AW_JS_CELL_TOP, _t.Const.CLASS_WIDGET_UI_NON_EDIT_CELL );
    tableTreeCommandCell.appendChild( treeCellTop );

    // ICON
    var iconElement = createIconElement( tableElem, vmo );
    treeCellTop.appendChild( iconElement );

    // DECORATOR
    var cellDecoratorElement = createCellDecoratorElement( tableElem, vmo );
    treeCellTop.appendChild( cellDecoratorElement );

    // IMAGE
    var cellImageElement = createCellImageElement( tableElem, vmo );
    if( cellImageElement ) {
        treeCellTop.appendChild( cellImageElement );
    }

    // TITLE
    var tableNonEditContainerElement = createTitleElement( tableElem, vmo, column );
    treeCellTop.appendChild( tableNonEditContainerElement );

    addTreeCommandCellEvents( tableTreeCommandCell, vmo, tableElem );

    return tableTreeCommandCell;
};

var createCheckMarkElementInternal = function( tableElem ) {
    var commandBarHtml =
        '<div class="aw-splm-tableCheckBoxPresent" >' + //
        '<a class="aw-commands-cellCommandCommon">' + //
        '<div class="afx-checkbox afx-checkbox-label-side">' + //
        '<input type="checkbox" class="aw-jswidgets-checkboxButton"/>' + //
        '<span class="afx-checkbox-md-style">' + //
        '<span class="check"></span>' + //
        '</span>' + //
        '</div>' + //
        '</a>' + //
        '</div>'; //
    var cellScope = {};

    return _t.util.createNgElement( commandBarHtml, tableElem, cellScope );
};

// NOTE: By this design, the cell command will only be available for OOTB AW Cell.
export let createCheckMarkElement = function( column, vmo, tableElem ) {
    var elem = createCheckMarkElementInternal( tableElem );
    applyCommandCellScope( elem, column, vmo );
    return elem;
};

export let addHighlights = function( displayValue ) {
    if( !highlighter ) {
        highlighter = appCtxService.getCtx( 'highlighter' );
    }
    if( highlighter && typeof displayValue === 'string' ) {
        return displayValue.replace( highlighter.regEx, ( match, chk, param ) => chk ? match : highlighter.style.replace( '$1', param ) );
    }
    return displayValue;
};

// This function is called when we click on any object link
// REFACTOR: Awp0ShowObjectCell is TC specific. Try to pull command ID from solution configuration
// instead.
var openObjectLink = function( propertyName, uid ) {
    if( uid && uid.length > 0 ) {
        var modelObject = cdm.getObject( uid );

        var vmo = {
            propertyName: propertyName,
            uid: uid
        };

        var commandContext = {
            vmo: modelObject || vmo, // vmo needed for gwt commands
            edit: false
        };
        commandService.executeCommand( 'Awp0ShowObjectCell', null, null, commandContext );
    }
};

// REFACTOR: The only meaning here to keep this is the _cellCmdElem mechanism, we can separate it out later.
export let createCellRenderer = function() {
    var _renderer = {};

    var _cellCmdElem;

    var _tooltipElement = _t.util.createElement( 'div', _t.Const.CLASS_AW_POPUP, _t.Const.CLASS_AW_TOOLTIP_POPUP, _t.Const.CLASS_TOOLTIP_POPUP );

    var createCommandCellHandler = function( cellTop, column, vmo, tableElem ) {
        return function() {
            //no commands visible when in multiselection/visible checkbox
            if( !tableElem._tableInstance.gridOptions.showCheckBox && ( !cellTop.lastChild || cellTop.lastChild && !cellTop.lastChild.classList.contains( _t.Const.CLASS_AW_CELL_COMMANDS ) ) ) {
                if( !_cellCmdElem ) {
                    // LCS-140017 - Follow up work for 14 table performance tuning
                    // In the initialization case one extra digest is needed to make sure
                    // anchor is getting compiled
                    _cellCmdElem = createCellCommandElementInternal( column, vmo, tableElem, true, true );
                } else {
                    applyCommandCellScope( _cellCmdElem, column, vmo, true );
                }
                cellTop.appendChild( _cellCmdElem );
            }
        };
    };

    var addCommandOnHover = function( commandHandlerParent, column, vmo, tableElem ) {
        commandHandlerParent.addEventListener( 'mouseover', createCommandCellHandler( commandHandlerParent, column, vmo, tableElem ) );
    };

    var getTooltipHTML = function( values ) {
        var tooltipInnerHTML = '<ul>';
        _.forEach( values, function( value ) {
            tooltipInnerHTML += '<li>' + exports.addHighlights( value ) + '</li>';
        } );
        tooltipInnerHTML += '</ul>';
        return tooltipInnerHTML;
    };

    var containsOnlyEmptyStrings = function( values ) {
        if( values.length ) {
            for( var i = 0; i < values.length; i++ ) {
                if( values[ i ] !== '' ) {
                    return false;
                }
            }
        }
        return true;
    };

    var getNewValues = function( prop ) {
        var newValues = [];
        // Get the new values, return an empty array if the values are all empty strings
        // to avoid creating unnecessary DOM elements.
        if( prop.isArray === true ) {
            // Only use uiValues if displayValues is not defined.
            if( prop.displayValues ) {
                if( !containsOnlyEmptyStrings( prop.displayValues ) ) {
                    newValues = prop.displayValues.slice();
                }
            } else if( prop.uiValues ) {
                if( !containsOnlyEmptyStrings( prop.uiValues ) ) {
                    newValues = prop.uiValues.slice();
                }
            }
        } else if( !containsOnlyEmptyStrings( [ prop.uiValue ] ) ) {
            newValues = [ prop.uiValue ];
        }
        return newValues;
    };

    var getOldValues = function( prop ) {
        var oldValues = [];
        if( prop.isArray === true && prop.oldValues && !containsOnlyEmptyStrings( prop.oldValues ) ) {
            oldValues = prop.oldValues.slice();
        } else if( prop.oldValue && !containsOnlyEmptyStrings( [ prop.oldValue ] ) ) {
            oldValues = [ prop.oldValue ];
        }
        return oldValues;
    };

    var addOpenObjectLinkHandler = function( objectElement, prop, index ) {
        var openObjLinkHandle = function( e ) {
            if( e.target && e.target.tagName.toLowerCase() === 'a' && e.target.href !== '' ) {
                return;
            }
            if( !prop.isEditable ) {
                e.cancelBubble = true;
                openObjectLink( prop.propertyName, prop.dbValues[ index ] );
            }
        };

        objectElement.addEventListener( 'click', function( event ) {
            openObjLinkHandle( event );
        } );

        objectElement.addEventListener( 'keydown', function( event ) {
            if( event.code === 'Enter' || event.code === 'Space' ) {
                openObjLinkHandle( event );
            }
        } );
    };

    const createPropertyValueLinkElement = function( prop, oldValue ) {
        if( prop.isEditable ) {
            return _t.util.createElement( 'a', _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS_DISABLED );
        } else if( oldValue ) {
            return _t.util.createElement( 'a', _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS, _t.Const.CLASS_AW_CHANGED_TEXT );
        }
        return _t.util.createElement( 'a', _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS );
    };

    var createObjectListFragment = function( prop, addOldValue, scope, dynamicRowHeightEnabled, tableElem ) {
        var fragment = document.createDocumentFragment();
        var newValues = getNewValues( prop );
        var oldValues = getOldValues( prop );
        var index = 0;
        while( newValues.length > 0 || oldValues.length > 0 ) {
            var liForObjectLinks = _t.util.createElement( 'li', _t.Const.CLASS_TABLE_NON_EDIT_CELL_LIST_ITEM );
            var newValue = newValues.shift();
            var oldValue = oldValues.shift();

            if( newValue ) {
                // use a different class when there is an object array.
                let objectElement = createPropertyValueLinkElement( prop, oldValue );
                objectElement.tabIndex = -1;
                if( dynamicRowHeightEnabled ) {
                    objectElement.style.whiteSpace = 'normal';
                }
                // href not to be associated with editable prop
                if( !_t.util.isBulkEditing( tableElem ) ) {
                    // associating every prop with href
                    var uidToBeEvaluated = '';
                    if( prop.isArray ) {
                        uidToBeEvaluated = prop.dbValue[ index ];
                    } else {
                        uidToBeEvaluated = prop.dbValue;
                    }
                    addHrefToAnchorLink( objectElement, scope, uidToBeEvaluated );
                }
                addOpenObjectLinkHandler( objectElement, prop, index );
                objectElement.innerHTML = exports.addHighlights( newValue );
                liForObjectLinks.appendChild( objectElement );
            }

            if( addOldValue && hasOldValue( oldValue, prop ) ) {
                var oldCellTextElement = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_PROPERTY_VALUE_LINKS_DISABLED, _t.Const.CLASS_AW_OLD_TEXT );
                oldCellTextElement.innerHTML = exports.addHighlights( oldValue );
                liForObjectLinks.appendChild( oldCellTextElement );
            }

            fragment.appendChild( liForObjectLinks );

            // Add cell text class to last li
            if( fragment.childNodes.length > 0 ) {
                fragment.childNodes[ fragment.childNodes.length - 1 ].classList.add( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT );
            }
            index++;
        }
        return fragment;
    };

    /**
     * Clear the child elements of the _tooltipElement.
     */
    var clearTooltipContent = function() {
        if( _tooltipElement.parentElement ) {
            _tooltipElement.parentElement.removeChild( _tooltipElement );
        }
        while( _tooltipElement.firstChild ) {
            _tooltipElement.removeChild( _tooltipElement.firstChild );
        }
    };

    var addTooltipListeners = function( parentElement, tooltipContent, tableElement ) {
        var tooltipTimeout = null;
        parentElement.addEventListener( 'mouseenter', function( event ) {
            clearTimeout( tooltipTimeout );
            if( event.offsetX > event.target.clientWidth ) {
                return false;
            }
            tooltipTimeout = setTimeout( function() {
                clearTooltipContent();
                var parentElementDimensions = parentElement.getBoundingClientRect();
                _tooltipElement.style.left = parentElementDimensions.left + 'px';
                _tooltipElement.style.top = parentElementDimensions.top + 'px';
                var tableBoundingBox = tableElement.getBoundingClientRect();
                _tooltipElement.style.maxWidth = tableBoundingBox.right - parentElementDimensions.left + 'px';
                // When tooltipContent is a document fragment, convert to array of html elements to maintain
                // references after appending
                if( tooltipContent instanceof DocumentFragment ) {
                    tooltipContent = Array.prototype.slice.call( tooltipContent.childNodes );
                }

                if( Array.isArray( tooltipContent ) ) {
                    for( var i = 0; i < tooltipContent.length; i++ ) {
                        _tooltipElement.appendChild( tooltipContent[ i ] );
                    }
                } else if( tooltipContent instanceof Element ) {
                    _tooltipElement.appendChild( tooltipContent );
                } else {
                    _tooltipElement.innerHTML = tooltipContent;
                }
                parentElement.appendChild( _tooltipElement );
            }, 750 );
        } );

        parentElement.addEventListener( 'mouseleave', function() {
            clearTimeout( tooltipTimeout );
            tooltipTimeout = setTimeout( clearTooltipContent, 750 );
        } );

        return _tooltipElement;
    };

    /**
     * Icon cell
     */
    var iconCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            var cell = _t.util.createElement( 'div', _t.Const.CLASS_CELL_CONTENTS, _t.Const.CLASS_SPLM_TABLE_ICON_CELL );

            var colorIndicatorElement = _t.util.createColorIndicatorElement( vmo );
            cell.appendChild( colorIndicatorElement );

            var cellImg = _t.util.createElement( 'img', _t.Const.CLASS_ICON_BASE, _t.Const.CLASS_ICON_TYPE,
                _t.Const.CLASS_SPLM_TABLE_ICON );
            var rowHeight = _t.util.getTableRowHeightForIconCellRenderer( _t.util.getTableInstance( tableElem ).gridOptions, undefined );
            if( rowHeight !== undefined ) {
                cellImg.style.height = rowHeight + 'px';
                cellImg.style.width = rowHeight + 'px';
            }
            cellImg.src = _t.util.getImgURL( vmo );
            cellImg.alt = getImageAltText( vmo );
            cell.appendChild( cellImg );
            return cell;
        },
        condition: function( column, vmo, tableElem ) {
            return column.name === 'icon';
        }
    };

    /**
     * Transpose Icon cell
     */
    const transposeIconCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            const cell = _t.util.createElement( 'div', _t.Const.CLASS_CELL_CONTENTS, _t.Const.CLASS_SPLM_TABLE_ICON_CELL );

            const colorIndicatorElement = _t.util.createColorIndicatorElement( vmo );
            cell.appendChild( colorIndicatorElement );

            const cellImg = _t.util.createElement( 'img', _t.Const.CLASS_ICON_BASE, _t.Const.CLASS_ICON_TYPE,
                _t.Const.CLASS_SPLM_TABLE_ICON );
            const rowHeight = _t.util.getTableRowHeightForIconCellRenderer( _t.util.getTableInstance( tableElem ).gridOptions, undefined );
            if( rowHeight !== undefined ) {
                cellImg.style.height = rowHeight + 'px';
                cellImg.style.width = rowHeight + 'px';
            }
            cellImg.src = _t.util.getImgURL( vmo.props[ column.field ] );
            cellImg.alt = getImageAltText( vmo );
            cell.appendChild( cellImg );
            return cell;
        },
        condition: function( column, vmo, tableElem ) {
            return tableElem._tableInstance.gridOptions.transpose === true && vmo.name === 'icon' && column.field !== 'transposedColumnProperty';
        }
    };

    /**
     * Command in cell
     */
    var commandCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            var cellContent = _t.Cell.createElement( column, vmo, tableElem, rowElem );
            if( cellContent ) {
                addCommandOnHover( cellContent, column, vmo, tableElem );
            }
            return cellContent;
        },
        condition: function( column, vmo, tableElem, rowElem ) {
            return column.isTableCommand;
        }
    };

    /**
     * Tree Node
     */
    var treeTableCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            var createTreeCellCommandElement = exports.createTreeCellCommandElement( column, vmo, tableElem );
            var commandHandlerParent = createTreeCellCommandElement.getElementsByClassName( _t.Const.CLASS_WIDGET_TABLE_NON_EDIT_CONTAINER )[ 0 ];
            addCommandOnHover( commandHandlerParent, column, vmo, tableElem );
            return createTreeCellCommandElement;
        },
        condition: function( column, vmo, tableElem, rowElem ) {
            return column.isTreeNavigation;
        }
    };

    /**
     * AW Object Reference
     */
    var objectCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            var prop = vmo.props[ column.field ];
            var ulForObjectLinks = _t.util.createElement( 'ul', _t.Const.CLASS_TABLE_NON_EDIT_CELL_LIST, _t.Const.CLASS_TABLE_CELL_TOP );
            var dynamicRowHeightEnabled = tableElem && tableElem._tableInstance.dynamicRowHeightStatus;
            if( dynamicRowHeightEnabled ) {
                ulForObjectLinks.classList.add( _t.Const.CLASS_TABLE_CELL_TOP_DYNAMIC );
            }

            // Prevent wrapping for cells that could have a command
            if( column.isTableCommand === true ) {
                ulForObjectLinks.style.flexWrap = 'nowrap';
                ulForObjectLinks.style.overflow = 'hidden';
            }

            var values = prop.displayValues || prop.uiValues;
            // Add tooltip
            var scope = _t.util.getElementScope( tableElem.parentElement, true );
            if( prop.isArray && values.length > 0 ) {
                var objectListDomFragment = createObjectListFragment( prop, null, scope, dynamicRowHeightEnabled, tableElem );
                if( objectListDomFragment ) {
                    addTooltipListeners( ulForObjectLinks, objectListDomFragment, tableElem );
                }
            } else {
                ulForObjectLinks.title = prop.uiValue;
            }

            var contentDomFragment = createObjectListFragment( prop, true, scope, dynamicRowHeightEnabled, tableElem );
            if( contentDomFragment ) {
                ulForObjectLinks.appendChild( contentDomFragment );
            }
            return ulForObjectLinks;
        },
        condition: function( column, vmo, tableElem, rowElem ) {
            return vmo.props &&
                vmo.props[ column.field ] &&
                ( vmo.props[ column.field ].type === 'OBJECT' ||
                    vmo.props[ column.field ].type === 'OBJECTARRAY' );
        }
    };

    var getCompiledFunctionFromCache = function( templateUrl, htmlString ) {
        // In order to stop loading/compiling same template again, template should be cached against its URL
        var renderingTemplateCache = AwCacheFactoryService.instance.get( 'propRenderingTemplate' );
        if( !renderingTemplateCache ) {
            renderingTemplateCache = AwCacheFactoryService.instance( 'propRenderingTemplate' );
        }
        var compiledTemplateFn = renderingTemplateCache.get( templateUrl );
        if( !compiledTemplateFn && !_.isEmpty( htmlString ) ) {
            compiledTemplateFn = _.template( htmlString );
            renderingTemplateCache.put( templateUrl, compiledTemplateFn );
        }
        return compiledTemplateFn;
    };

    var loadTemplate = function( containerElement, vmo, templateUrl, dependentServices ) {
        var deferred = AwPromiseService.instance.defer();
        AwHttpService.instance.get( templateUrl, { cache: true } ).then( function( response ) {
            var htmlString = response;
            if( htmlString ) {
                deferred.resolve( { containerElement: containerElement, templateUrl: templateUrl, vmo: vmo, htmlString: response.data, dependentServices: dependentServices } );
            }
        } );
        return deferred.promise;
    };

    var updateContainerElement = function( containerElement, vmo, propName, tooltipProps, templateUrl, htmlString, depServices, column ) {
        var compiledTemplateFn = getCompiledFunctionFromCache( templateUrl, htmlString );
        var generatedElement = compiledTemplateFn( {
            vmo: vmo,
            propName: propName,
            tooltipProps: tooltipProps,
            basePath: app.getBaseUrlPath(),
            dependentServices: depServices,
            column: column
        } );
        containerElement.innerHTML = generatedElement.trim();
    };
    var updateContainerWithCellTemplate = function( containerElement, vmo, propName, tooltipProps, templateUrl, htmlString, depsToInject, column ) {
        if( depsToInject && depsToInject.length > 0 ) {
            for( var dep in depsToInject ) {
                var cachedDep = declUtils.getDependentModule( depsToInject[ dep ] );
                if( cachedDep && _.isEmpty( htmlString ) ) {
                    updateContainerElement( containerElement, vmo, propName, tooltipProps, templateUrl, htmlString, [ cachedDep ], column );
                } else {
                    declUtils.loadDependentModule( depsToInject[ dep ] ).then( function( depServices ) {
                        updateContainerElement( containerElement, vmo, propName, tooltipProps, templateUrl, htmlString, [ depServices ], column );
                    } );
                }
            }
        } else {
            updateContainerElement( containerElement, vmo, propName, tooltipProps, templateUrl, htmlString, depsToInject, column );
        }
    };

    var getColRendererTemplateToUse = function( propName, tableElem, retrieveHeader ) {
        var renderingTemplate = {};
        var propRenderTemplates = _propVsRenderingTemplate[ propName ];
        var gridId = tableElem.id;
        var defaultRenderingTemplate = _defaultRenderingTemplates[ gridId ];
        if( defaultRenderingTemplate ) {
            if( defaultRenderingTemplate.isHeaderTemplate === true && retrieveHeader === true ) {
                renderingTemplate = defaultRenderingTemplate;
            } else if( defaultRenderingTemplate.isCellTemplate === true && retrieveHeader === false ) {
                renderingTemplate = defaultRenderingTemplate;
            }
        }

        if( propRenderTemplates ) {
            var propDefault = propRenderTemplates.defaultPropRenderingTemplate;
            if( propDefault ) {
                if( propDefault.isHeaderTemplate === true && retrieveHeader === true ) {
                    renderingTemplate = propDefault;
                } else if( propDefault.isCellTemplate === true && retrieveHeader === false ) {
                    renderingTemplate = propDefault;
                }
            }
            _.forEach( propRenderTemplates.specificRenderingTemplates, function( propRenderTemplate ) {
                if( propRenderTemplate.grids.indexOf( gridId ) >= 0 ) {
                    if( propRenderTemplate.isHeaderTemplate === true && retrieveHeader === true ||
                        propRenderTemplate.isCellTemplate === true && retrieveHeader === false ) {
                        renderingTemplate = propRenderTemplate;
                        return;
                    }
                }
            } );
        }
        return renderingTemplate;
    };

    var isCustomTemplate = function( defaultTemplate, specificTemplate, retrieveHeader ) {
        if( !_.isEmpty( specificTemplate ) ) {
            for( var i = 0; i < specificTemplate.length; i++ ) {
                var currentTemplate = specificTemplate[ i ];
                if( retrieveHeader ) {
                    if( currentTemplate.isHeaderTemplate === true ) {
                        return true;
                    }
                } else {
                    if( currentTemplate.isCellTemplate === true ) {
                        return true;
                    }
                }
            }
        }
        if( !_.isEmpty( defaultTemplate ) ) {
            if( retrieveHeader ) {
                if( defaultTemplate.isHeaderTemplate === true ) {
                    return true;
                }
            } else {
                if( defaultTemplate.isCellTemplate === true ) {
                    return true;
                }
            }
        }
        return false;
    };

    var isGraphicalRenderrDefinedForProp = function( propName, gridid, retrieveHeader ) {
        if( _.isEmpty( _propVsRenderingTemplate ) ) {
            generatePropRendererTemplateMap();
        }

        var propRenderingObj = _propVsRenderingTemplate[ propName ];
        if( propRenderingObj ) {
            var isHeaderTrue = isCustomTemplate( propRenderingObj.defaultPropRenderingTemplate, propRenderingObj.specificRenderingTemplates, retrieveHeader );
            var isCellTrue = isCustomTemplate( propRenderingObj.defaultPropRenderingTemplate, propRenderingObj.specificRenderingTemplates, retrieveHeader );
            if( isHeaderTrue === true && retrieveHeader === true ) {
                return true;
            } else if( isCellTrue === true && retrieveHeader === false ) {
                return true;
            }
        }

        if( _defaultRenderingTemplates[ gridid ] ) {
            if( _defaultRenderingTemplates[ gridid ].isHeaderTemplate === true && retrieveHeader === true ) {
                return true;
            } else if( _defaultRenderingTemplates[ gridid ].isCellTemplate === true && retrieveHeader === false ) {
                return true;
            }
        }
        return false;
    };

    // Returns the correct property name
    const getPropName = function( column, vmo, tableElem ) {
        let propName = column.field;
        if( tableElem._tableInstance.gridOptions.transpose === true ) {
            propName = vmo.props.transposedColumnProperty.dbValue;
        }
        return propName;
    };

    var customCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            var retrieveHeader = false;
            var propName = getPropName( column, vmo, tableElem );
            var colRenderTemplateDef = getColRendererTemplateToUse( propName, tableElem, retrieveHeader );
            var containerElement = null;
            if( !_.isEmpty( colRenderTemplateDef.template ) ) {
                //Template processing -> No need for async processing..
                containerElement = _t.util.createElement( 'div', _t.Const.CLASS_TABLE_CELL_TOP );
                updateContainerWithCellTemplate( containerElement, vmo, column.field, colRenderTemplateDef.tooltip,
                    colRenderTemplateDef.template, colRenderTemplateDef.template, colRenderTemplateDef.dependentServices );
            } else if( !_.isEmpty( colRenderTemplateDef.templateUrl ) ) {
                //Async loading for template once template is loaded
                containerElement = _t.util.createElement( 'div', _t.Const.CLASS_TABLE_CELL_TOP );
                var templateUrl = app.getBaseUrlPath() + colRenderTemplateDef.templateUrl;

                var compiledTemplateFn = getCompiledFunctionFromCache( templateUrl, null );
                if( compiledTemplateFn ) {
                    //If compiled function already exists for templateUrl, return
                    updateContainerWithCellTemplate( containerElement, vmo, column.field, colRenderTemplateDef.tooltip,
                        templateUrl, '', colRenderTemplateDef.dependentServices );
                } else {
                    loadTemplate( containerElement, vmo, templateUrl, colRenderTemplateDef.dependentServices ).then( function( response ) {
                        updateContainerWithCellTemplate( response.containerElement, response.vmo, column.field, colRenderTemplateDef.tooltip,
                            response.templateUrl, response.htmlString, response.dependentServices );
                    } );
                }
            } else if( !_.isEmpty( colRenderTemplateDef.renderFunction ) ) {
                containerElement = _t.util.createElement( 'div', _t.Const.CLASS_TABLE_CELL_TOP );
                var args = [ vmo, containerElement, column.field, colRenderTemplateDef.tooltip ];
                var cachedDepModuleObj = declUtils.getDependentModule( colRenderTemplateDef.deps );
                if( !cachedDepModuleObj ) {
                    declUtils.loadDependentModule( colRenderTemplateDef.deps ).then( function( depModuleObj ) {
                        depModuleObj[ colRenderTemplateDef.renderFunction ].apply( null, args );
                        return containerElement;
                    } );
                } else {
                    cachedDepModuleObj[ colRenderTemplateDef.renderFunction ].apply( null, args );
                }
            }
            if( containerElement !== null ) {
                containerElement.style.paddingLeft = _t.Const.CUSTOM_CELL_LEFTPADDING_DEFAULT_SPACE + 'px';
            }
            return containerElement; // If container element is null, default rendering will happen
        },
        condition: function( column, vmo, tableElem ) {
            var retrieveHeader = false;
            var propName = column.field;

            // If transpose, use the propName representing the vmo to apply the renderer across the row instead of column for transpose.
            // Don't apply renderer for the first column in transpose since it represents the column property.
            if( tableElem._tableInstance.gridOptions.transpose === true && column.field !== 'transposedColumnProperty' ) {
                propName = vmo.props.transposedColumnProperty.dbValue;
            }

            if( column.enableRendererContribution && isGraphicalRenderrDefinedForProp( propName, tableElem.id, retrieveHeader ) ) {
                //If propertyRenderer template defined for a given property, use it for rendering
                return true;
            }
            return false;
        }
    };

    var customCellHeaderRenderer = {
        action: function( column, tableElem ) {
            var retrieveHeader = true;
            var colRenderTemplateDef = getColRendererTemplateToUse( column.field, tableElem, retrieveHeader );
            var containerElement = null;
            if( !_.isEmpty( colRenderTemplateDef.headerTemplate ) ) {
                //Template processing -> No need for async processing..
                containerElement = document.createElement( 'div' );
                updateContainerWithCellTemplate( containerElement, null, column.field, colRenderTemplateDef.tooltip,
                    colRenderTemplateDef.headerTemplate, colRenderTemplateDef.headerTemplate, colRenderTemplateDef.dependentServices, column );
            } else if( !_.isEmpty( colRenderTemplateDef.headerTemplateUrl ) ) {
                //Async loading for template once template is loaded
                containerElement = document.createElement( 'div' );
                var templateUrl = app.getBaseUrlPath() + colRenderTemplateDef.headerTemplateUrl;
                var compiledTemplateFn = getCompiledFunctionFromCache( templateUrl, null );
                if( compiledTemplateFn ) {
                    //If compiled function already exists for templateUrl, return
                    updateContainerWithCellTemplate( containerElement, null, column.field, colRenderTemplateDef.tooltip,
                        templateUrl, '', colRenderTemplateDef.dependentServices, column );
                } else {
                    loadTemplate( containerElement, null, templateUrl, colRenderTemplateDef.dependentServices ).then( function( response ) {
                        updateContainerWithCellTemplate( response.containerElement, response.vmo, column.field, colRenderTemplateDef.tooltip,
                            response.templateUrl, response.htmlString, response.dependentServices, column );
                    } );
                }
            } else if( !_.isEmpty( colRenderTemplateDef.headerRenderFunction ) ) {
                containerElement = document.createElement( 'div' );
                var args = [ containerElement, column.field, colRenderTemplateDef.tooltip, column ];
                var cachedDepModuleObj = declUtils.getDependentModule( colRenderTemplateDef.deps );
                if( !cachedDepModuleObj ) {
                    declUtils.loadDependentModule( colRenderTemplateDef.deps ).then( function( depModuleObj ) {
                        depModuleObj[ colRenderTemplateDef.headerRenderFunction ].apply( null, args );
                        return containerElement;
                    } );
                } else {
                    cachedDepModuleObj[ colRenderTemplateDef.headerRenderFunction ].apply( null, args );
                }
            }
            if( containerElement !== null ) {
                containerElement.style.paddingLeft = _t.Const.CUSTOM_HEADER_LEFTPADDING_DEFAULT_SPACE + 'px'; //default padding for header
            }
            return containerElement; // If container element is null, default rendering will happen
        },
        condition: function( column, tableElem ) {
            var retrieveHeader = true;
            if( column.enableRendererContribution && isGraphicalRenderrDefinedForProp( column.field, tableElem.id, retrieveHeader ) ) {
                //If propertyRenderer template defined for a given property, use it for rendering
                return true;
            }
            return false;
        }
    };

    /**
     * Rich Text Field
     */
    var richTextCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            var prop = vmo.props[ column.field ];
            var newValues = getNewValues( prop );
            var oldValues = getOldValues( prop );

            var cellTop = _t.util.createElement( 'ul', _t.Const.CLASS_TABLE_NON_EDIT_CELL_LIST, _t.Const.CLASS_TABLE_CELL_TOP );
            if( tableElem && tableElem._tableInstance.dynamicRowHeightStatus ) {
                cellTop.classList.add( _t.Const.CLASS_TABLE_CELL_TOP_DYNAMIC );
            }

            // Add tooltip
            if( newValues.length > 0 ) {
                var tooltipHTML = getTooltipHTML( newValues );
                addTooltipListeners( cellTop, tooltipHTML, tableElem );
            }

            while( newValues.length > 0 || oldValues.length > 0 ) {
                var liElement = _t.util.createElement( 'li', _t.Const.CLASS_TABLE_NON_EDIT_CELL_LIST_ITEM );
                liElement.style.width = '100%';

                var rtfContainer;
                var newValue = newValues.shift();
                var oldValue = oldValues.shift();

                if( newValue ) {
                    if( oldValue ) {
                        rtfContainer = _t.util.createElement( 'div', _t.Const.CLASS_TABLE_RTF_CELL_ITEM, _t.Const.CLASS_AW_CHANGED_TEXT );
                    } else {
                        rtfContainer = _t.util.createElement( 'div', _t.Const.CLASS_TABLE_RTF_CELL_ITEM );
                    }
                    rtfContainer.innerHTML = exports.addHighlights( newValue );
                    liElement.appendChild( rtfContainer );
                }

                if( hasOldValue( oldValue, prop ) ) {
                    var oldCellTextElement = _t.util.createElement( 'div', _t.Const.CLASS_AW_OLD_TEXT );
                    oldCellTextElement.innerHTML = exports.addHighlights( oldValue );
                    liElement.appendChild( oldCellTextElement );
                }

                // NOTE: For Firefox there is a limitation that the vertical scroll bar is not show up,
                // because of issue below:
                // https://stackoverflow.com/questions/28636832/firefox-overflow-y-not-working-with-nested-flexbox
                // there is a workaround by using { min-height: 0 }, I have not tested it yet and no plan to fix it
                // now.
                // It is not only an RTF issue, same problem for string list and object list

                // Dynamic styling for RTF
                if( rtfContainer && rtfContainer.childElementCount > 1 && newValues.length === 1 ) {
                    liElement.style.height = '100%';
                }
                cellTop.appendChild( liElement );
            }

            return cellTop;
        },
        condition: function( column, vmo, tableElem, rowElem ) {
            return vmo.props &&
                vmo.props[ column.field ] &&
                vmo.props[ column.field ].isRichText;
        }
    };

    /**
     * Plain Text
     */
    var simpleTextCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            var prop = vmo.props[ column.field ];
            var dynamicRowHeightEnabled = tableElem && tableElem._tableInstance.dynamicRowHeightStatus;
            var cellTop = _t.util.createElement( 'div', _t.Const.CLASS_TABLE_CELL_TOP );
            if( dynamicRowHeightEnabled ) {
                cellTop.classList.add( _t.Const.CLASS_TABLE_CELL_TOP_DYNAMIC );
            }

            if( prop.uiValue ) {
                var gridCellText = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT );
                if( dynamicRowHeightEnabled ) {
                    gridCellText.classList.add( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT_DYNAMIC );
                }
                cellTop.title = prop.uiValue;
                var parsedValue = sanitizer.htmlEscapeAllowEntities( prop.uiValue, true, true );

                if( ( column.isTableCommand || column.isTreeNavigation ) && clickableTitleService.hasClickableCellTitleActions() ) {
                    addClickableCellTitle( gridCellText, vmo, parsedValue, tableElem );
                } else {
                    gridCellText.innerHTML = exports.addHighlights( parsedValue );
                }
                cellTop.appendChild( gridCellText );
            }

            return cellTop;
        },
        condition: function( column, vmo, tableElem, rowElem ) {
            return vmo.props &&
                vmo.props[ column.field ] &&
                !vmo.props[ column.field ].isRichText &&
                !hasOldValue( false, vmo.props[ column.field ] ) &&
                !vmo.props[ column.field ].isArray;
        }
    };

    var plainTextCellRenderer = {
        action: function( column, vmo, tableElem, rowElem ) {
            var prop = vmo.props[ column.field ];
            var newValues = getNewValues( prop );
            var oldValues = getOldValues( prop );

            var dynamicRowHeightEnabled = tableElem && tableElem._tableInstance.dynamicRowHeightStatus;

            var ulElement = _t.util.createElement( 'ul', _t.Const.CLASS_TABLE_NON_EDIT_CELL_LIST, _t.Const.CLASS_TABLE_CELL_TOP );
            if( dynamicRowHeightEnabled ) {
                ulElement.classList.add( _t.Const.CLASS_TABLE_CELL_TOP_DYNAMIC );
            }

            // Add tooltip
            if( prop.isArray ) {
                if( newValues.length > 0 ) {
                    var tooltipHTML = getTooltipHTML( newValues );
                    addTooltipListeners( ulElement, tooltipHTML, tableElem );
                }
            } else {
                ulElement.title = prop.uiValue;
            }

            while( newValues.length > 0 || oldValues.length > 0 ) {
                var liElement = _t.util.createElement( 'li', _t.Const.CLASS_TABLE_NON_EDIT_CELL_LIST_ITEM );
                var newValue = newValues.shift();
                var oldValue = oldValues.shift();
                var textElem;

                if( newValue ) {
                    if( hasOldValue( oldValue, prop ) ) {
                        textElem = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT, _t.Const.CLASS_AW_CHANGED_TEXT );
                    } else {
                        textElem = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT );
                    }

                    var parsedValue = sanitizer.htmlEscapeAllowEntities( newValue, true, true );
                    textElem.innerHTML = exports.addHighlights( parsedValue );
                    if( dynamicRowHeightEnabled ) {
                        textElem.classList.add( _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT_DYNAMIC );
                    }
                    liElement.appendChild( textElem );
                }

                if( oldValue ) {
                    var oldCellTextElement = _t.util.createElement( 'div', _t.Const.CLASS_WIDGET_TABLE_CELL_TEXT, _t.Const.CLASS_AW_OLD_TEXT );
                    oldCellTextElement.innerHTML = exports.addHighlights( oldValue );
                    liElement.appendChild( oldCellTextElement );
                }
                ulElement.appendChild( liElement );
            }

            return ulElement;
        },
        condition: function( column, vmo, tableElem, rowElem ) {
            return vmo.props && vmo.props[ column.field ] &&
                !vmo.props[ column.field ].isRichText &&
                ( vmo.props[ column.field ].isArray ||
                hasOldValue( false, vmo.props[ column.field ] ) );
        }
    };

    var headerCellRenderer = {
        action: function( column ) {
            var labelElem = document.createElement( 'div' );
            labelElem.classList.add( _t.Const.CLASS_HEADER_CELL_LABEL );
            labelElem.textContent = column.displayName;
            return labelElem;
        },
        condition: function() {
            return true;
        }
    };

    var headerIconCellRenderer = {
        action: function( column ) {
            let cellContent = document.createElement( 'div' );
            let imgContainer = _t.util.createElement( 'div', _t.Const.CLASS_HEADER_ICON_CONTAINER );
            var cellImg = _t.util.createElement( 'img', _t.Const.CLASS_HEADER_ICON );
            cellImg.src = _t.util.getImgURL( column.vmo );
            cellImg.alt = getImageAltText( column.vmo );
            imgContainer.appendChild( cellImg );
            cellContent.appendChild( imgContainer );
            cellContent.appendChild( headerCellRenderer.action( column ) );
            return cellContent;
        },
        condition: function( column, tableElem ) {
            return tableElem._tableInstance.gridOptions.enableHeaderIcon === true && column.field !== 'transposedColumnProperty';
        }
    };

    /**
     * exposed method
     */
    _renderer.resetHoverCommandElement = function() {
        if( _cellCmdElem && _cellCmdElem.parentElement ) {
            _cellCmdElem.parentElement.removeChild( _cellCmdElem );
        }
    };

    _renderer.destroyHoverCommandElement = function() {
        if( _cellCmdElem ) {
            _t.util.destroyNgElement( _cellCmdElem );
        }
        _cellCmdElem = null;
    };

    _renderer.getAwCellRenderers = function() {
        // NOTE: If the condition is not isolated, then the sequence matters.
        // Decorator renderers should be first in the array since they will call
        // _t.Cell.createElement to get cell content provided by the next valid renderer.
        return [
            commandCellRenderer,
            customCellRenderer,
            iconCellRenderer,
            transposeIconCellRenderer,
            treeTableCellRenderer,
            objectCellRenderer,
            simpleTextCellRenderer,
            plainTextCellRenderer,
            richTextCellRenderer
        ];
    };

    _renderer.getAwHeaderRenderers = function() {
        return [
            customCellHeaderRenderer,
            headerIconCellRenderer,
            headerCellRenderer
        ];
    };

    return _renderer;
};

/**
 * Check if old value is available or not
 * @param  old value
 * @param old value of prop
 * @return boolean True/False
 */
function hasOldValue( oldValue, prop ) {
    return oldValue || !_.isUndefined( prop.oldValue );
}

exports = {
    createCellCommandElement,
    createTreeCellCommandElement,
    createCheckMarkElement,
    addHighlights,
    createCellRenderer
};
export default exports;
/**
 * This service provides necessary APIs to navigate to a URL within AW.
 *
 * @memberof NgServices
 * @member awSPLMTableCellRendererFactory
 *
 * @returns {Object} Reference to SPLM table.
 */
app.factory( 'awSPLMTableCellRendererFactory', () => exports );
