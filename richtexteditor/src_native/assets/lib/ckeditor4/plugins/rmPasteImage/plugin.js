/*global
 CKEDITOR
 */
/**
 * This plugin will Allow user to copy paste the image from word to ckeditor.
 * This feature is already provided by ckeditor but that is not applicable on Chrome.
 * This plugin will only be affected on chrome.
 * It is also removing Paste from ckeditor context menu, is it is not available on chrome.
 */
CKEDITOR.plugins.add( 'rmPasteImage',
{
    init: function( editor )
    {
        var plugin_path = this.path;
        var IMAGE_MIME_REGEX = /^image\/(p?jpeg|gif|png|bmp)$/i;

        CKEDITOR.on( 'instanceLoaded', function( ev ) {

            ev.editor.config.pasteFromWordCleanupFile = plugin_path + "filter/default.js";
            ev.editor.on( 'contentDom', function( ev ) {
                if( ev.editor.document && ev.editor.document.$ ) {
                    if (!CKEDITOR.env.gecko && window.FileReader) {
                        // Remove Paste command from context menu, as it is not available on chrome.
                        editor.removeMenuItem('paste');
                        ev.editor.document.$.onpaste = function(e){
                            var items = e.clipboardData.items;

                            for (var i = 0; i < items.length; i++) {
                                if (IMAGE_MIME_REGEX.test(items[i].type)) {
                                    _pasteImage(items[i].getAsFile());
                                }
                                else
                                {
                                    break;
                                }
                            }
                        };
                    }
                }

            });
        });

        /**
         * @param {Object} file - file
         */
        var _pasteImage = function(file) {
            var reader = new FileReader();
            reader.onload = function(e){
                var img = document.createElement('img');
                img.src = e.target.result;
                editor.insertElement( new CKEDITOR.dom.element(img) );
            };
            reader.readAsDataURL(file);
        };

    }
} );
