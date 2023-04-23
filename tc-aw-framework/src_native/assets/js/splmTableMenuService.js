// Copyright (c) 2020 Siemens

/**
 * Used for handling PL Table menus
 *
 * @module js/splmTableMenuService
 *
 */
import _ from 'lodash';
import _t from 'js/splmTableNative';
import eventBus from 'js/eventBus';
import columnFilterUtility from 'js/awColumnFilterUtility';
import popupService from 'js/popupService';
import localeService from 'js/localeService';
import messagingService from 'js/messagingService';
import narrowModeService from 'js/aw.narrowMode.service';
import wcagService from 'js/wcagService';

var SPLMTableMenuService = function( table, directiveElement, tableInstance ) {
    var self = this;
    var _table = table;
    var _tableInstance = tableInstance;
    var _dataProvider = _tableInstance.dataProvider;
    var _columnProvider = _tableInstance.columnProvider;
    var _gridId = _tableInstance.gridId;
    var _gridOptions = _tableInstance.gridOptions;
    var _splmTableMessages = _tableInstance.messages;
    var _directiveElement = directiveElement;
    var _trv = new _t.Trv( table );
    var _keyboardService = tableInstance.keyboardService;
    var _selectionHelper = null;
    var _contextMenuElem = null;
    var _gridMenuCommandElem = null;
    var _columnMenuSubscriptions = [];
    // Add menu service to table instance
    _tableInstance.menuService = self;

    // ////////////////////////////////////////////////
    // Grid Menu
    // ////////////////////////////////////////////////
    var createAwTableMenu = function() {
        var html = '<aw-popup-command-bar anchor="{{contextAnchor}}" context="commandContext" own-popup="false" class="grid-menu-command" alignment="HORIZONTAL"></aw-command-bar>';
        var isArrangeSupported = _columnProvider.isArrangeSupported();
        var isNarrowMode = narrowModeService.isNarrowMode();
        var cellScope = {
            contextAnchor: _dataProvider.json.gridMenuCommandsAnchor ? _dataProvider.json.gridMenuCommandsAnchor : 'aw_gridMenu',
            commandContext: {
                dataProvider: _dataProvider,
                columnProvider: _columnProvider,
                gridId: _gridId,
                gridOptions: _gridOptions,
                isArrangeSupported: isArrangeSupported,
                isNarrowMode: isNarrowMode,
                tableInstance: _tableInstance
            },
            showpopup: true
        };
        return _t.util.createNgElement( html, _directiveElement, cellScope );
    };

    const focusElementOnClose = function( focusElem, isEditDisable ) {
        setTimeout( function() {
            const isDisabledDuringEdit = isEditDisable && _t.util.isBulkEditing( _table );
            if( focusElem && document.activeElement && document.activeElement.tagName === 'BODY' && !isDisabledDuringEdit ) {
                focusElem.focus();
            }
        }, 150 );
    };

    var loadGridMenuItems = function() {
        _gridMenuCommandElem = createAwTableMenu();
        _gridMenuCommandElem.id = _table.id + '_menu';

        var settingsCommandElement = _table.getElementsByClassName( 'aw-splm-tableMenuButton' )[ 0 ];

        var loadGridMenu = function( event, focusOnCloseElem ) {
            event.preventDefault();
            if( !self.gridMenuPopupRef ) {
                popupService.show( {
                    domElement: _gridMenuCommandElem,
                    context: _t.util.getElementScope( _gridMenuCommandElem, true ),
                    options: {
                        whenParentScrolls: 'close',
                        ignoreReferenceClick: true,
                        reference: settingsCommandElement,
                        placement: 'bottom-end',
                        hasArrow: true,
                        autoFocus: true,
                        customClass: 'aw-popup-gridMenu',
                        padding: { x: 4, y: 4 },
                        forceCloseOthers: false,
                        hooks: {
                            whenClosed: () => {
                                self.gridMenuPopupRef = null;
                                focusElementOnClose( focusOnCloseElem );
                            }
                        }
                    }
                } ).then( ( popupRef ) => {
                    self.gridMenuPopupRef = popupRef;
                } );
            } else {
                self.ensureTableMenuDismissed();
            }
        };

        settingsCommandElement.addEventListener( 'click', loadGridMenu );
        settingsCommandElement.addEventListener( 'keydown', function( event ) {
            if( wcagService.isValidKeyPress( event ) ) {
                loadGridMenu( event, settingsCommandElement );
            }
        } );
    };

    self.addGridMenu = function( awIconService ) {
        var localeGridMenuText = _splmTableMessages.gridMenu;
        var html = '' +
            '<div class="aw-commands-svg">' +
            '<button type="button" class="aw-commands-commandIconButton icon-override" tabindex="-1" title="' + localeGridMenuText + '" aria-label="' + localeGridMenuText + '" >' +
            awIconService.getIconDef( 'cmdSettings' ) +
            '</button>' +
            '</div>';
        var menu = _t.util.createElement( 'div', 'aw-splm-tableMenuButton' );
        menu.innerHTML = html;
        var btn = menu.querySelector( 'button' );
        _keyboardService.setOnFocusAndBlur( btn );
        _table.insertBefore( menu, _table.children[ 0 ] );
        loadGridMenuItems();
    };

    // ////////////////////////////////////////////////
    // Context Menu
    // ////////////////////////////////////////////////
    var createContextMenu = function() {
        var html = '<aw-popup-command-bar anchor="{{contextAnchor}}" own-popup="false" close-on-click="true" ></aw-popup-command-bar>';
        var cellScope = {};
        cellScope.contextAnchor = _dataProvider.json.contextMenuCommandsAnchor ? _dataProvider.json.contextMenuCommandsAnchor : 'aw_contextMenu2';
        return _t.util.createNgElement( html, _directiveElement, cellScope );
    };

    var _handleContextMenuSingleSelect = function( rowVmoArray, selectionModel, event, dataProvider ) {
        var currentMode = selectionModel.mode;
        selectionModel.setMode( 'single' );
        _selectionHelper.handleSelectionEvent( rowVmoArray, selectionModel, event, dataProvider );
        selectionModel.setMode( currentMode );
    };

    self.addContextMenu = function( selectionHelper ) {
        _selectionHelper = selectionHelper;
        _contextMenuElem = createContextMenu();
    };

    self.contextSelectionHandler = function( event ) {
        if( event.target.tagName.toLowerCase() === 'a' && event.target.href !== '' ) {
            return;
        }
        if( _gridOptions.showContextMenu !== true ) {
            return;
        }
        event.preventDefault();
        event.cancelBubble = true;

        let focusOnCloseElem = _t.util.closestElement( event.target, '.' + _t.Const.CLASS_CELL );

        popupService.show( {
            domElement: _contextMenuElem,
            context: _t.util.getElementScope( _contextMenuElem, true ),
            options: {
                whenParentScrolls: 'close',
                resizeToClose: true,
                targetEvent: event,
                reference: event.target,
                autoFocus: true,
                forceCloseOthers: false,
                hooks: {
                    whenClosed: () => {
                        focusElementOnClose( focusOnCloseElem, true );
                    }
                }
            }
        } );

        var rowElement = event.currentTarget;

        /* if (right or left) click inside row we already have selected, we dont want to do another SOA call since commands already loaded,
        just move panel with to mouse location */
        if( rowElement.classList.contains( 'aw-state-selected' ) || rowElement.classList.contains( 'ui-grid-row-selected' ) ) {
            return;
        }

        while( _table.getElementsByClassName( 'aw-state-selected' ).length > 0 ) {
            _table.getElementsByClassName( 'aw-state-selected' )[ 0 ].classList.remove( 'aw-state-selected' );
            _table.getElementsByClassName( 'ui-grid-row-selected' )[ 0 ].classList.remove( 'ui-grid-row-selected' );
        }

        var selectionModel = _dataProvider.selectionModel;

        _handleContextMenuSingleSelect( [ rowElement.vmo ], selectionModel, event );
    };

    /**
     *
     * @param {AwColumnInfo} columnDef - The column Def
     * @param {String} tgtDir - Target Direction for sort
     * @param {appCtxService} appCtxService - The appCtxService
     */
    var columnSortChanged = function( columnDef, tgtDir, appCtxService ) {
        var tableCtrl = _t.util.getTableController( _table );
        if( _t.util.isBulkEditing( _table ) ) {
            return;
        }

        var newColumnIdx = columnDef.index;
        var oldColumnIdx = -1;
        var columnField = columnDef.field;

        var targetDirection = tgtDir;

        if( _columnProvider.sortCriteria ) {
            if( _columnProvider.sortCriteria.length > 0 ) {
                var oldSortCriteria = _columnProvider.sortCriteria[ 0 ];
                oldColumnIdx = tableCtrl.getIdxFromColumnName( oldSortCriteria.fieldName );

                if( oldColumnIdx === newColumnIdx && oldSortCriteria.fieldName === columnField &&
                    oldSortCriteria.sortDirection.toUpperCase() === tgtDir.toUpperCase() ) {
                    return;
                }
            }
        }

        if( !_columnProvider.sortCriteria ) {
            _columnProvider.sortCriteria = [];
        } else {
            _columnProvider.sortCriteria.pop();
        }

        if( targetDirection !== '' ) {
            _columnProvider.sortCriteria.push( {
                fieldName: columnField,
                sortDirection: targetDirection
            } );
        }

        _table._tableInstance.focusHeader = columnField;

        // Sets sort criteria on declColumnProviderJSON
        _columnProvider.setSortCriteria( _columnProvider.sortCriteria );

        // Update sort criteria in sublocation context
        var sublocationCtx = appCtxService.getCtx( 'sublocation' );
        if( sublocationCtx ) {
            // LCS-137109 - Sorting new AW table elements by column not working
            // Copy columnProvider.sortCriteria instead of using reference
            appCtxService.updatePartialCtx( sublocationCtx.clientScopeURI + '.sortCriteria', _.clone( _columnProvider.sortCriteria ) );

            appCtxService.ctx.sublocation.sortCriteria = _columnProvider.sortCriteria;
        }

        tableCtrl.setHeaderCellSortDirection( oldColumnIdx, newColumnIdx, targetDirection );

        if( _columnProvider.sortCallback ) {
            _columnProvider.sortCallback();
        }
    };

    var getLargestFrozenColumnIndex = function( columns ) {
        var largestFrozenIndex = 0;
        for( var i = 0; i < columns.length; i++ ) {
            // Check if frozen and for index of frozen column
            if( columns[ i ].index > largestFrozenIndex && columns[ i ].pinnedLeft ) {
                largestFrozenIndex = columns[ i ].index;
            }
        }
        return largestFrozenIndex;
    };

    /**
     * Determines if server is available, calls function to hide the column based on columnDef
     * @param {AwColumnInfo} columnDef - The column Def
     */
    var hideColumn = function( columnDef ) {
        var columnIndex = columnDef.index;
        var columns = _dataProvider.cols;

        let isOnlyVisibleColumn = true;
        _.forEach( columns, function( currentColumn ) {
            if( currentColumn.name !== columnDef.name && currentColumn.visible === true && currentColumn.name !== 'icon' ) {
                isOnlyVisibleColumn = false;
                return false;
            }
        } );

        if( !isOnlyVisibleColumn ) {
            if( _columnProvider.isArrangeSupported() && _columnProvider.hideColumn ) {
                // account for hidden columns
                if( _dataProvider.cols[ columnIndex ].propertyName !== columnDef.propertyName ) {
                    for( var i = 0; i < columns.length; i++ ) {
                        if( columns[ i ].propertyName === columnDef.propertyName ) {
                            columnIndex = i;
                            break;
                        }
                    }
                }
                _columnProvider.hideColumn( columnIndex );
            } else {
                var tableCtrl = _t.util.getTableController( _table );
                tableCtrl.updateColumnVisibility( columnDef.field );
            }
        } else {
            localeService.getLocalizedText( 'UIMessages', 'hideColumnOnlyVisibleError' ).then( function( message ) {
                messagingService.showError( message );
            } );
        }
    };

    /**
     * Determines whether or not to show the column Hide menu item
     * @param {AwColumnInfo} _columnProvider - The columnProvider
     * @param {Object} column - column definition
     * @returns {Boolean} true if Hide Column menu item should be displayed
     */
    var showHideMenu = function( _columnProvider, column ) {
        if( column.enableColumnHiding === false ) {
            return false;
        }
        if( _columnProvider.isArrangeSupported() ) {
            if( column.propertyName === 'object_name' ) {
                return false;
            }
            if( _gridOptions.useStaticFirstCol && column.index === 0 ) {
                return false;
            }
        }

        return true;
    };

    /**
     * Find and return the column provider based on the grid.
     *
     * @param {String} gridId - Id of the data grid
     * @param {Object} grids  - All of the data grids
     * @param {Object} columnProviders - All of the column providers
     *
     * @returns {Object} The found columnProvider
     */
    let findColumnProvider = function( gridId, grids, columnProviders ) {
        if( gridId && grids && columnProviders ) {
            var foundGrid = grids[ gridId ];

            if( foundGrid ) {
                return columnProviders[ foundGrid.columnProvider ];
            }
        }
        return undefined;
    };

    self.loadDefaultColumnMenus = function( appCtxService ) {
        // Make default frozen column the highest index that is pinnedLeft from column config
        // Or default to 0/1 depending on icon column
        var columns = _dataProvider.cols;
        var largestFrozenIndex = getLargestFrozenColumnIndex( columns );

        // Set default frozen index to 1 or 0 based on if icon column is present
        var defaultFrozenIndex = _gridOptions.addIconColumn ? 1 : 0;

        // Use pinnedLeft if provided
        if( largestFrozenIndex > 0 ) {
            defaultFrozenIndex = largestFrozenIndex;
        }

        // Check if pinning is enabled
        var pinningEnabled;
        if( _gridOptions.enablePinning !== undefined ) {
            pinningEnabled = _gridOptions.enablePinning;
        } else {
            pinningEnabled = true;
        }

        // Check if sorting is enabled overall
        var enableSorting;
        if( _gridOptions.enableSorting !== undefined ) {
            enableSorting = _gridOptions.enableSorting;
        } else {
            enableSorting = true;
        }

        _.forEach( columns, function( column ) {
            // Sort Menus
            var _sortAscMenu = {
                title: _splmTableMessages.sortAscending,
                action: function() {
                    columnSortChanged( column, 'ASC', appCtxService );
                },
                shown: function() {
                    return enableSorting && column.enableSorting && !_t.util.isBulkEditing( _table );
                },
                icon: _t.Const.CLASS_ICON_SORT_ASC,
                selectionCheck: function( colInfo ) {
                    var criteria = _t.util.getSortCriteria( colInfo, _columnProvider );
                    if( !_.isEmpty( criteria ) ) {
                        return criteria.sortDirection === 'ASC';
                    }
                    return false;
                }
            };

            var _sortDescMenu = {
                title: _splmTableMessages.sortDescending,
                action: function() {
                    columnSortChanged( column, 'DESC', appCtxService );
                },
                shown: function() {
                    return enableSorting && column.enableSorting && !_t.util.isBulkEditing( _table );
                },
                icon: _t.Const.CLASS_ICON_SORT_DESC,
                selectionCheck: function( colInfo ) {
                    var criteria = _t.util.getSortCriteria( colInfo, _columnProvider );
                    if( !_.isEmpty( criteria ) ) {
                        return criteria.sortDirection === 'DESC';
                    }
                    return false;
                }
            };

            var _removeSortMenu = {
                title: _splmTableMessages.removeSort,
                action: function() {
                    columnSortChanged( column, '', appCtxService );
                },
                shown: function() {
                    return enableSorting && column.enableSorting && !_t.util.isBulkEditing( _table );
                },
                icon: _t.Const.CLASS_ICON_SORTABLE,
                selectionCheck: function( colInfo ) {
                    var criteria = _t.util.getSortCriteria( colInfo, _columnProvider );
                    if( _.isEmpty( criteria ) ) {
                        return true;
                    }
                    return false;
                }
            };

            // Hide menu
            var _hideMenu = {
                title: _splmTableMessages.hideColumn,
                action: function() {
                    hideColumn( column );
                },
                shown: function() {
                    return showHideMenu( _columnProvider, column );
                },
                icon: _t.Const.CLASS_ICON_HIDE
            };

            // Freeze Menus
            var _freezeMenu = {
                title: _splmTableMessages.freezeMenu,
                action: function() {
                    var tableCtrl = _t.util.getTableController( _table );
                    tableCtrl.pinToColumn( column.index );
                },
                shown: function() {
                    var tableCtrl = _t.util.getTableController( _table );
                    return pinningEnabled && column.index + 1 !== tableCtrl.getPinColumnCount();
                },
                icon: _t.Const.CLASS_ICON_FREEZE
            };

            // unfreeze menu definition - shows as Freeze but selected
            var _unfreezeMenu = {
                title: _splmTableMessages.freezeMenu,
                action: function() {
                    var tableCtrl = _t.util.getTableController( _table );
                    tableCtrl.pinToColumn( defaultFrozenIndex );
                    let scrollLeft = column.startPosition;
                    // set scroll container to this position to keep header focused
                    let scrollCanvas = _trv.getScrollCanvasElementFromTable();
                    scrollCanvas.scrollLeft = scrollLeft;
                },
                shown: function() {
                    var tableCtrl = _t.util.getTableController( _table );
                    return pinningEnabled && ( column.index !== defaultFrozenIndex && column.index + 1 === tableCtrl.getPinColumnCount() );
                },
                icon: _t.Const.CLASS_ICON_FREEZE,
                selectionCheck: function() {
                    return true;
                }
            };

            if( !column.menuItems ) {
                column.menuItems = [];
            }

            column.menuItems.push( _sortAscMenu );
            column.menuItems.push( _sortDescMenu );
            column.menuItems.push( _removeSortMenu );
            column.menuItems.push( _hideMenu );
            column.menuItems.push( _freezeMenu );
            column.menuItems.push( _unfreezeMenu );
        } );
    };

    self.ensureAllTableMenusDismissed = function() {
        self.ensureColumnMenuDismissed();
        self.ensureTableMenuDismissed();
    };

    self.ensureTableMenuDismissed = function() {
        self.gridMenuPopupRef && popupService.hide( self.gridMenuPopupRef );
        self.gridMenuPopupRef = null;
    };

    // ////////////////////////////////////////////////
    // Column Menu
    // ////////////////////////////////////////////////
    self.ensureColumnMenuDismissed = function() {
        self.columnMenuPopupRef && popupService.hide( self.columnMenuPopupRef );
        self.columnMenuPopupRef = null;
    };

    self.createColumnMenuElement = function() {
        var menu = document.createElement( 'div' );
        menu.id = _table.id + '_menu';
        menu.classList.add( _t.Const.CLASS_TABLE_MENU );
        menu.classList.add( _t.Const.CLASS_TABLE_MENU_POPUP );
        menu.setAttribute( 'role', 'menu' );

        var menuContainer = document.createElement( 'div' );
        menuContainer.id = _table.id + '_menuContainer';
        menuContainer.classList.add( _t.Const.CLASS_TABLE_MENU_CONTAINER );
        // since this is inserted into the DOM outside of the content area, need to re-apply the content class
        menuContainer.classList.add( 'afx-content-background' );
        menuContainer.classList.add( 'aw-hierarchical-popup' );
        menuContainer.appendChild( menu );

        return menuContainer;
    };

    self.menuElements = [];

    const isTargetPopupOpen = function( target ) {
        return target && target.dataset && target.dataset.popupId && target.dataset.popupId !== 'null';
    };

    const createMenuItemElement = function( menuItem, columnDef ) {
        const listElem = _t.util.createElement( 'li', _t.Const.CLASS_AW_CELL_LIST_ITEM, _t.Const.CLASS_AW_CELL_TOP );
        listElem.setAttribute( 'role', 'menuitem' );
        listElem.onclick = function() {
            menuItem.action();
            self.ensureColumnMenuDismissed();
        };
        listElem.onkeydown = function( event ) {
            if( wcagService.isValidKeyPress( event ) ) {
                menuItem.action();
                self.ensureColumnMenuDismissed();
            }
        };
        listElem.tabIndex = 0;

        var iconElem = _t.util.createElement( 'i', menuItem.icon );
        var textElem = _t.util.createElement( 'div' );
        textElem.textContent = menuItem.title;
        listElem.appendChild( iconElem );
        listElem.appendChild( textElem );

        // Show as selected
        if( menuItem.selectionCheck && menuItem.selectionCheck( columnDef ) ) {
            listElem.classList.add( _t.Const.CLASS_HEADER_MENU_ITEM_SELECTED );
        }
        return listElem;
    };

    const createFilterBoxElement = function( filterScope, columnDef ) {
        const filterBoxElement = _t.util.createElement( 'li',
            _t.Const.CLASS_TABLE_MENU_ITEM, _t.Const.CLASS_AW_CELL_TOP, _t.Const.CLASS_COLUMN_MENU_FILTER_CONTAINER );

        // compile type-based filter
        var viewStr = '<aw-include class="column-filter" name="' + columnDef.filter.view + '" sub-panel-context="context"></aw-include>';
        var filterViewElem = _t.util.createNgElement( viewStr, table, filterScope );
        self.menuElements.push( filterViewElem );
        filterBoxElement.appendChild( filterViewElem );
        filterBoxElement.setAttribute( 'role', 'menuitem' );

        // Only add these filter sections to default filter views
        var defaultFilterViews = [
            columnFilterUtility.FILTER_VIEW.TEXT,
            columnFilterUtility.FILTER_VIEW.DATE,
            columnFilterUtility.FILTER_VIEW.NUMERIC
        ];
        if( _.includes( defaultFilterViews, columnDef.filter.view ) ) {
            // compile a facet list
            if( _dataProvider.getFilterFacets && _dataProvider.filterFacetAction ) {
                var facetFilterString = '<aw-include class="facet-filter-container" name="facetFilter" sub-panel-context="context"></aw-include>';
                var facetFilterViewElement = _t.util.createNgElement( facetFilterString, table, filterScope );
                self.menuElements.push( facetFilterViewElement );
                filterBoxElement.appendChild( facetFilterViewElement );
            }

            // compile filter submit buttons
            var submitFilterString = '<aw-include name="submitButtonsFilter" sub-panel-context="context"></aw-include>';
            var submitFilterViewElement = _t.util.createNgElement( submitFilterString, table, filterScope );
            self.menuElements.push( submitFilterViewElement );
            filterBoxElement.appendChild( submitFilterViewElement );
        }
        return filterBoxElement;
    };

    const showColumnMenuPopup = function( target, menuContainer, isFocused, focusOnClose ) {
        const getPadding = () => {
            // getCellCenter
            const cell = target;
            const { width, height } = cell.getBoundingClientRect();
            return { x: -width / 2, y: -height / 2 };
        };

        const menuItemKeydownHandler = ( event ) => {
            const eventCode = wcagService.getKeyName( event );
            const clearButtonElement = document.getElementById( 'columnMenuClearButton' );
            const filterButtonElement = document.getElementById( 'columnMenuFilterButton' );
            if ( document.activeElement === clearButtonElement && eventCode === 'ArrowRight'
                    || document.activeElement === filterButtonElement && eventCode === 'ArrowLeft' ) {
                event.preventDefault();
                event.stopPropagation();
                eventCode === 'ArrowRight' ? filterButtonElement.focus() : clearButtonElement.focus();
            }
            wcagService.handleMoveUpOrDown( event, menuContainer );
        };

        popupService.show( {
            domElement: menuContainer,
            context: _t.util.getElementScope( menuContainer, true ),
            options: {
                whenParentScrolls: 'close',
                ignoreReferenceClick: true,
                reference: target,
                placement: 'right',
                adaptiveShift: true,
                autoFocus: true,
                selectedElementCSS: '.aw-splm-tableMenuItemSelected',
                hasArrow: true,
                forceCloseOthers: false,
                padding: getPadding(),
                arrowOptions: {
                    alignment: 'center',
                    offset: 5,
                    shift: 15
                },
                hooks: {
                    whenClosed: () => {
                        if( _columnMenuSubscriptions.length ) {
                            _.forEach( _columnMenuSubscriptions, function( subscription ) {
                                eventBus.unsubscribe( subscription );
                            } );
                            _columnMenuSubscriptions.length = 0;
                        }
                        menuContainer.removeEventListener( 'keydown', menuItemKeydownHandler );
                        menuContainer.setAttribute( 'aria-expanded', 'false' );
                        focusElementOnClose( focusOnClose );
                    }
                }
            }
        } ).then( ( popupRef ) => {
            self.columnMenuPopupRef = popupRef;
            _columnMenuSubscriptions.push( eventBus.subscribe( 'pltable.columnFilterApplied', function() {
                self.ensureColumnMenuDismissed();
            } ) );
            menuContainer.addEventListener( 'keydown', menuItemKeydownHandler );

            menuContainer.setAttribute( 'aria-expanded', 'true' );
        } );
    };

    const isColumnMenuDisabled = function( columnDef ) {
        return _t.util.isBulkEditing( _table ) || columnDef.enableColumnMenu === false || _t.util.isCellEditing( _table );
    };

    self.columnMenuHandler = function( columnElem, isFocused ) {
        var columnDef = columnElem.columnDef;
        return function( event ) {
            if( isColumnMenuDisabled( columnDef ) ) {
                return;
            }
            event.preventDefault();

            var menuContainer = self.createColumnMenuElement();
            var menuElement = menuContainer.getElementsByClassName( _t.Const.CLASS_TABLE_MENU )[ 0 ];
            if( isTargetPopupOpen( event.currentTarget ) && self.columnMenuPopupRef ) {
                self.ensureColumnMenuDismissed();
            } else {
                // Add menu item
                _.forEach( columnDef.menuItems, function( item ) {
                    if( item.shown() ) {
                        var listElem = createMenuItemElement( item, columnDef );
                        menuElement.appendChild( listElem );
                    }
                } );

                if( columnDef.filter && columnDef.filter.view && columnDef.isFilteringEnabled !== false &&
                    _table._tableInstance.gridOptions.isFilteringEnabled ) {
                    if( columnDef.menuItems.length > 0 ) {
                        // Add horizontal bar
                        var hr = _t.util.createElement( 'hr' );
                        menuElement.appendChild( hr );
                    }

                    //Column filters needs to be added to the viewModel columnProvider for viewModel actions
                    let viewModelColumnProvider = findColumnProvider( _table.id, _table._tableInstance.declViewModel.grids, _table._tableInstance.declViewModel.columnProviders );

                    var filterScope = {};
                    filterScope.context = {
                        gridId: _table.id,
                        column: columnDef,
                        dataProvider: _dataProvider,
                        columnProvider: viewModelColumnProvider,
                        isBulkEditing: _t.util.isBulkEditing( _table )
                    };

                    var filterBoxItemElem = createFilterBoxElement( filterScope, columnDef );

                    menuElement.appendChild( filterBoxItemElem );
                }

                showColumnMenuPopup( event.currentTarget, menuContainer, isFocused, columnElem.parentElement );
                tableInstance.columnMenuLoaded = true;
            }
        };
    };

    /**
     * Add new facets to the filter
     *
     * @param {Object} column - column definition
     * @param {Object} columnFilterSvc - column filter service
     * @param {Object} uiValues - new value name with selected value
     * @param {Number} totalFound - total facets found
     */
    self.addFacets = function( column, columnFilterSvc, uiValues, totalFound ) {
        var currentValues = column.filter.columnValues;
        var hasBlanks = currentValues.filter( function( value ) {
            return value.propertyDisplayName === column.filter.blanksI18n;
        } );
        const isBulkEditing = _t.util.isBulkEditing( _table );

        column.filter.facetTotalFound = totalFound;
        _.forEach( uiValues, function( value, key ) {
            if( key !== '(blanks)' || hasBlanks.length === 0 ) {
                var currentValue = columnFilterSvc.createFacetProp( key, _gridId, column, !column.filter.isSelectedFacetValues, isBulkEditing );
                if( key === '(blanks)' ) {
                    currentValues.unshift( currentValue );
                } else {
                    currentValues.push( currentValue );
                }
            }
        } );

        column.filter.columnValues = currentValues;
    };

    /**
     * Reload the facet filter from scratch.
     *
     * @param {Object} column - column definition
     * @param {Object} columnFilterSvc - column filter service
     * @param {Object} uiValues - value name with selected value
     * @param {Number} totalFound - total facets found
     */
    self.reloadFacets = function( column, columnFilterSvc, uiValues, totalFound ) {
        var tableMenuElem = _trv.queryTableMenu( _table.id ).getElement();
        var filterBoxItemElem = tableMenuElem.getElementsByClassName( _t.Const.CLASS_COLUMN_MENU_FILTER_CONTAINER )[ 0 ];
        var originalFacetFilterContainer = filterBoxItemElem.getElementsByClassName( _t.Const.CLASS_COLUMN_MENU_FACET_CONTAINER )[ 0 ];
        const isBulkEditing = _t.util.isBulkEditing( _table );

        var columnValues = [];
        column.filter.facetTotalFound = totalFound;
        // Set the select all fireValueChangeEvent function
        column.filter.isSelectedFacetValues = false;
        columnFilterSvc.updateSelectAllProp( column, _gridId, isBulkEditing );

        if( totalFound > 0 ) {
            column.filter.noFacetResults = false;
            _.forEach( uiValues, function( value, key ) {
                var currentValue = columnFilterSvc.createFacetProp( key, _gridId, column, true, isBulkEditing );
                if( key === '(blanks)' ) {
                    columnValues.unshift( currentValue );
                } else {
                    columnValues.push( currentValue );
                }
            } );

            column.filter.columnValues = columnValues;

            //Column filters needs to be added to the viewModel columnProvider for viewModel actions
            let viewModelColumnProvider = findColumnProvider( _table.id, _table._tableInstance.declViewModel.grids, _table._tableInstance.declViewModel.columnProviders );

            var filterScope = {};
            filterScope.context = {
                gridId: _table.id,
                column: column,
                dataProvider: _dataProvider,
                columnProvider: viewModelColumnProvider,
                isBulkEditing: isBulkEditing
            };

            var viewStr = '<aw-include class="' + _t.Const.CLASS_COLUMN_MENU_FACET_CONTAINER + '" name="facetFilter" sub-panel-context="context"></aw-include>';

            var filterViewElem = _t.util.createNgElement( viewStr, table, filterScope );
            self.menuElements.push( filterViewElem );
            filterBoxItemElem.replaceChild( filterViewElem, originalFacetFilterContainer );
            _t.util.destroyNgElement( originalFacetFilterContainer );
        } else {
            column.filter.columnValues = [];
            // No results found, show i18n title for it
            column.filter.noFacetResults = true;
        }
    };

    self.setFilterDisability = function( isDisabled ) {
        var tableMenuElem = _trv.queryTableMenu( _table.id ).getElement();
        var filterButtonElement = tableMenuElem.getElementsByClassName( 'filter-button' )[ 0 ];

        if( filterButtonElement ) {
            if( isDisabled ) {
                filterButtonElement.classList.add( 'disabled' );
            } else {
                filterButtonElement.classList.remove( 'disabled' );
            }
        }
    };

    return self;
};

export default SPLMTableMenuService;
