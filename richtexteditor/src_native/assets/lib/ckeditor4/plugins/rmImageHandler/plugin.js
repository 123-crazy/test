/*global
 CKEDITOR
 */
CKEDITOR.plugins.add( 'rmImageHandler',
{
    init: function( editor )
    {
        // Only add this button if browser supports File API
        if ( window.File )
        {

               editor.addCommand( 'rmImageCommand',
                       {
                           exec : function( editor )
                           {
                               var form = document.createElement ("form");
                               form.setAttribute ("id", "fileUploadForm");

                               var input = document.createElement ("input");
                               form.appendChild(input);
                               //form.append("fmsFile",input);

                               input.setAttribute ("type", "file");
                               input.setAttribute ("id", "fmsFile");
                               input.setAttribute ("name", "fmsFile");
                               input.setAttribute ("accept","image/x-png,image/gif,image/jpeg,image/jpg,image/bmp,image/wmf,image/x-wmf");

                               input.addEventListener('change', function(){

                                   var file = this.files[ 0 ];

                                   if ( file ) {


                                       var eventBus = editor.eventBus;

                                       var eventData = {
                                               "clientid" : this.value,
                                               "file" : file,
                                               "form" : this.form
                                           };
                                           eventBus.publish( "requirementDocumentation.InsertImageInCKEditor",
                                                           eventData);


                                   }

                                }, false);

                               input.click();
                           },
                           startDisabled: true
                       });

            editor.on( 'selectionChange', function( evt ) {
                var myCommand = this.getCommand( 'rmImageCommand' );
                if(myCommand) {
                    var ranges = editor.getSelection().getRanges();
                    if(ranges && ranges.length > 0 && !ranges[0].checkReadOnly()) {
                        myCommand.enable();
                    }else {
                        myCommand.disable();
                    }
                }
            });

            editor.ui.addButton( 'rmImageUpload',
            {
                label: editor.insertImage,
                command: 'rmImageCommand',
                icon: editor.getBaseURL + editor.getBaseUrlPath + "/image/cmdInsertImage24.svg",
                toolbar: 'insert,10'
            } );
        }

    }
} );
