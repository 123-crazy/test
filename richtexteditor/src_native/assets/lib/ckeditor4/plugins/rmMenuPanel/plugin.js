/**
 * The rmMenuPanel plugin that provides an ability to create a popup menu on the given element at a precise position in the document.
 * This plugin is developed based on balloonPanel plugin to customize/extend the capability of it.
 */
/*global
 CKEDITOR
 */

'use strict';
CKEDITOR.plugins.add('rmMenuPanel',{
    requires: 'balloonpanel',

    init: function(){
        var stylesLoaded = false;

        if ( !stylesLoaded ) {
            CKEDITOR.document.appendStyleSheet( this.path + 'style/' + 'style.css' );
            stylesLoaded = true;
        }

        CKEDITOR.ui.rmMenuPanel = function(editor,definition){
            CKEDITOR.ui.balloonPanel.call(this,editor,definition);
        };

    CKEDITOR.ui.rmMenuPanel.prototype = Object.create(CKEDITOR.ui.balloonPanel.prototype);

    // custom template definitions.
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.panel = '<div class="aw-ckeditor-popup" style="{style}"></div>';
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.content = '<div class="aw-ckeditor-popupContent">{content}</div>';
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.close = '<span> </span>';
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.title = '<span>{title}</span>';
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.triangleOuter = '<span> </span>';
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.triangleInner = '<span> </span>';

    // template definitations for popup menu.
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.menubutton = '<span class="aw-ckeditor-menubutton"></span>';
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.menubuttonSelected = '<span class="aw-ckeditor-menubutton aw-ckeditor-menubuttonSelected"></span>';
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.menuicon = '<span class="aw-ckeditor-menubuttonIcon" style="background-image:url(' + "'{iconURL}'" + ');"></span>';
    CKEDITOR.ui.rmMenuPanel.prototype.templateDefinitions.menulabel = '<span class="aw-ckeditor-menubuttonLabel">{label}</span>';

    CKEDITOR.ui.rmMenuPanel.prototype.build = function( ) {

                // call existing build function
                CKEDITOR.ui.balloonPanel.prototype.build.call(this);

                var editor = this.editor;

                // Create menu from data
                if( this.menuList ){
                    for (var i = 0; i < this.menuList.length; i++) {
                        var menuContent = this.menuList[i];
                        var menubuttonElement;
                        if(menuContent.selected) {
                            menubuttonElement = CKEDITOR.dom.element.createFromHtml(this.templates.menubuttonSelected.output());
                        } else {
                            menubuttonElement = CKEDITOR.dom.element.createFromHtml(this.templates.menubutton.output());
                        }

                        if(menuContent.icon){
                            var menuiconElement = CKEDITOR.dom.element.createFromHtml(this.templates.menuicon.output( { iconURL : menuContent.icon } ));
                            menubuttonElement.append( menuiconElement );
                        }

                        var menulabelElement = CKEDITOR.dom.element.createFromHtml(this.templates.menulabel.output( { label : menuContent.label } ));
                        menubuttonElement.append( menulabelElement );

                        attachMenuHandler(editor, menubuttonElement, menuContent.actionHandler);

                        // Add menu item to the panel
                        this.parts.content.append( menubuttonElement );
                    }
                }

                var editable = editor.editable(),
                evtRoot = editor.document;

                editable.attachListener( evtRoot, 'mouseup', function(evt) {
                    closePanel( this );
                }, this );

                editable.attachListener( editable.getDocument(), 'scroll', function() {
                    closePanel( this );
                }, this);

                this.parts.panel.on( 'click', function() {
                    closePanel( this );
                }, this);

                var self = this;

                document.body.addEventListener('click', function() {
                    closePanel( self );
                }, self);
            };

    CKEDITOR.ui.rmMenuPanel.prototype._getAlignments = function( elementRect, panelWidth, panelHeight ) {
                return {
                    'bottom left': {
                        top: elementRect.top,
                        left: elementRect.left + elementRect.width + 2
                    },
                    'top left': {
                        top: elementRect.bottom - panelHeight,
                        left: elementRect.left + elementRect.width + 2
                    }
                };
            };

            /**
             * Check if menu panel is visible, if yes, hide & destroy it
             *
             * @param {panel} panel
             */
            function closePanel( panel ) {
                if( panel.rect && panel.rect.visible ) {
                    panel.hide();
                    panel.destroy();
                }
            }

            /**
             * Attach the click handler for the menu item.
             *
             * @param {object} editor
             * @param {element} menubuttonElement
             * @param {String} actionHandler
             */
            function attachMenuHandler( editor, menubuttonElement, actionHandler ) {
                menubuttonElement.on('click', function(evt){
                    editor.execCommand( actionHandler );
                });
            }
    }

    /**
     * The definition of a rmMenuPanel.
     *
     * This virtual class illustrates the properties that developers can use to define and create
     * rmMenuPanel.
     *
     *        CKEDITOR.ui.rmMenuPanel( editor, {
     *            title: 'My Menu',
     *            menuList: [{
     *                    label : 'Requirement',
     *                    icon : 'icon_url',
     *                    selected : false,
     *                    actionHandler : 'command to be executed'
     *                },
     *                ...
     *            ]
     *        } );
     *
     * @class CKEDITOR.ui.rmMenuPanel.definition
     */

    /**
     * The title of the rmMenuPanel.
     *
     * @member CKEDITOR.ui.rmMenuPanel.definition
     * @property {String} title
     */

    /**
     * The list of menu commands for the rmMenuPanel.
     *
     * @member CKEDITOR.ui.rmMenuPanel.definition
     * @property {array} menuList
     */

    /**
     * The label for menu item.
     *
     * @member CKEDITOR.ui.rmMenuPanel.definition.menuList
     * @property {String} label
     */

    /**
     * The url of icon for menu item.
     *
     * @member CKEDITOR.ui.rmMenuPanel.definition.menuList
     * @property {String} icon
     */

    /**
     * The menu item should be displayed as selected.
     *
     * @member CKEDITOR.ui.rmMenuPanel.definition.menuList
     * @property {boolean} selected
     */

    /**
     * The command name, which should get executed on menu click.
     *
     * @member CKEDITOR.ui.rmMenuPanel.definition.menuList
     * @property {String} actionHandler
     */
});



