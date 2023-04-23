// @<COPYRIGHT>@
// ==================================================
// Copyright 2019.
// Siemens Product Lifecycle Management Software Inc.
// All Rights Reserved.
// ==================================================
// @<COPYRIGHT>@

/*global
 define
 $$
 */

/**
 * Directive to display the Kanban in AW.
 * @module js/aw-kanban.directive
 * @requires app
 * @requires js/aw-kanban.controller
 */

import app from 'app';
import * as webix from 'webix';
import $ from 'jquery';
import 'js/aw-kanban.controller';
import 'js/appCtxService';
import 'js/localeService';

app.directive( 'awKanban', [ 'appCtxService', 'localeService', function( appCtxService, localeSvc ) {
    return {
        restrict: 'E',
        scope: {
            kanbanid: '@'
        },
        replace: false,
        transclude: false,
        templateUrl: app.getBaseUrlPath() + '/html/aw-kanban.directive.html',
        controller: 'awKanbanCtrl',
        link: function( $scope, $element, $attr, $controller ) {
            var dataProvider = $controller.readDataProvider( $scope );
            var providerPromise = $controller.readKanbanConfigAndPrepareProvider( $scope, $element );
            providerPromise.then( function() {
                var columns = $scope.kanbanColumns;
                var kanbanData = dataProvider.viewModelCollection.loadedVMObjects;

                var height = $element[ 0 ].clientHeight - 40; //40 is buffer for webix
                var width = $element[ 0 ].clientWidth;

                var kanbanOptions = $scope.kanbanOptions;
                if( kanbanOptions ) {
                    if( kanbanOptions.height ) {
                        height = kanbanOptions.height;
                    }
                    if( kanbanOptions.width ) {
                        width = kanbanOptions.width;
                    }
                }

                webix.type( webix.ui.kanbanlist, {
                    name: 'cards',
                    icons: [],
                    // avatar template
                    templateAvatarLeft: function( obj ) {
                        let taskIcon = obj.iconURL;
                        let iconTooltip = obj.iconTooltip;
                        if( !taskIcon ) {
                            var iconSvc = app.getInjector().get( 'iconService' );
                            var cdm = app.getInjector().get( 'soa_kernel_clientDataModel' );
                            var objType = 'WorkspaceObject';
                            var id = obj.id;
                            var iconUid = obj.leftIconUID;
                            if( iconUid ) {
                                var iconObject = cdm.getObject( iconUid );
                                if( iconObject ) {
                                    objType = iconObject.type;
                                    iconTooltip = iconObject.props.object_name.uiValues[ 0 ];
                                }
                            } else {
                                iconObject = cdm.getObject( id );
                                objType = iconObject.type;
                                iconTooltip = iconObject.props.object_name.uiValues[ 0 ];
                            }
                            taskIcon = iconSvc.getTypeIconURL( objType );
                        }

                        return '<img class=\'avatar\' src=' + taskIcon + ' title=\'' + iconTooltip + '\' alt=\'' + iconTooltip + '\'></img>';
                    },

                    // avatar template
                    templateAvatarRight: function( obj ) {
                        let taskIcon = obj.iconRightURL;
                        let iconTitle = obj.iconRightTitle;
                        let iconTooltip = obj.iconRightTooltip;
                        if( !taskIcon ) {
                            var iconSvc = app.getInjector().get( 'iconService' );
                            var cdm = app.getInjector().get( 'soa_kernel_clientDataModel' );
                            var objType = 'User';
                            var iconUid = obj.rightIconUID;
                            iconTooltip = getLocalizedText( 'unassigned', 'KanbanInterfaceConstants' ); // unassinged

                            if( iconUid ) {
                                var iconObject = cdm.getObject( iconUid );
                                if( iconObject ) {
                                    objType = iconObject.type;
                                    if( iconObject.modelType.typeHierarchyArray.indexOf( 'User' ) > -1 && iconObject.props.user_name ) {
                                        iconTooltip = iconObject.props.user_name.uiValues[ 0 ];
                                    } else if( iconObject.props.object_name ) {
                                        iconTooltip = iconObject.props.object_name.uiValues[ 0 ];
                                    }
                                }
                            }
                            if( obj.iconRightTooltip ) {
                                iconTooltip = obj.iconRightTooltip;
                            }
                            taskIcon = iconSvc.getTypeIconURL( objType );
                        }
                        return '<img class=\'avatar\' src=' + taskIcon + ' title=\'' + iconTitle + '\n ' + iconTooltip + '\' alt=\'' + iconTitle + '\'></img>';
                    },

                    template: function( obj, common ) {
                        var kanban = webix.$$( common.master );
                        var color = kanban._colors.exists( obj.color ) ? kanban._colors.getItem( obj.color ).color : obj.color;
                        var avatarLeft = '<div class=\'webix_kanban_user_avatarLeft\' webix_icon_id=\'$avatar\'>' + common.templateAvatarLeft( obj, common, kanban ) + '</div>';
                        var body = '<div class=\'webix_kanban_body\'>' + avatarLeft + common.templateBody( obj, common, kanban ) + '</div>';
                        if( obj.showRightIcon ) {
                            var avatarRight = '<div class=\'webix_kanban_user_avatarRight\' webix_icon_id=\'$avatar\'>' + common.templateAvatarRight( obj, common, kanban ) + '</div>';
                            body = '<div class=\'webix_kanban_body\'>' + avatarLeft + avatarRight + common.templateBody( obj, common, kanban ) + '</div>';
                        }

                        var attachments = kanban.config.attachments ? common.templateAttachments( obj, common, kanban ) : '';
                        var footer = '<div class=\'webix_kanban_footer\'>' + common.templateFooter( obj, common, kanban ) + '</div>';
                        return '<div class=\'webix_kanban_list_content\'' + ( color ? ' style=\'border-left-color:' + color + '\'' : '' ) + '>' + attachments + body + footer + '</div>';
                    }
                } );

                webix.ready( function() {
                    var webixData = webix.ui( {
                        view: 'kanban',
                        borderless: false,
                        type: '',
                        id: $scope.kanbanid,
                        cardActions: false,
                        on: {
                            onListItemClick: $controller.onListItemClick,
                            onListAfterDrop: $controller.onAfterDrop,
                            onListAfterSelect: $controller.onListAfterSelect,
                            onListBeforeDrop: $controller.onListBeforeDrop
                        },
                        cols: columns,
                        data: kanbanData,
                        flex: true,
                        width: width,
                        height: height,
                        editor: false
                    }, $element[ 0 ].firstElementChild );

                    $$( $scope.kanbanid ).eachList( function( list, status ) {
                        if( list && list.$view ) {
                            list.$view.setAttribute( 'tabindex', '0' );
                            list.$view.setAttribute( 'aria-label', list._parent_cell.config.header() );
                        }
                    } );
                } );

                function resizer() {
                    var height = $element[ 0 ].clientHeight;
                    var width = $element[ 0 ].clientWidth;
                    $$( $scope.kanbanid ).config.height = height;
                    $$( $scope.kanbanid ).config.width = width;
                    $$( $scope.kanbanid ).resize();
                }

                function getLocalizedText( key, resource ) {
                    var localeTextBundle = localeSvc.getLoadedText( resource );
                    return localeTextBundle[ key ];
                }

                $( window ).resize( resizer );
                //And remove it when the scope is destroyed
                $scope.$on( '$destroy', function() {
                    $$( $scope.kanbanid ).destructor();
                    $( window ).off( 'resize', resizer );
                } );
            } );
        }
    };
} ] );
