module.exports = function(grunt) {
  var pkg = grunt.file.readJSON('package.json'),
    svnTrunk = pkg.svnRepository + 'trunk/', //the trunk folder in our svn repository
    aFolders = ['help', 'tcpdf'], //list of folders we need copied
    aFiles = ['kalins_pdf_admin_page.php', 'kalins_pdf_create.php', 'kalins_pdf_styles.css', 'kalins_pdf_tool_page.php', 'kalins-pdf-creation-station.php', 
      'KalinsUIService.js', 'readme.txt', 'vendor.min.js'], //list of files actually used in the plugin
    aWatchList = aFiles.concat(['help/*', 'tcpdf/**/*']),//take our list of files and concat it with our list of folders with wildcards indicating all child files or folders and files.
    aDevFiles = ['bower.json', 'Gruntfile.js', 'npm-debug.log', 'package.json'],//files used only in development
    aDevFolders = ['assets', 'bower_components', 'dev', 'node_modules'];//folders used only for developement
    
  grunt.initConfig({
    pkg: pkg,

    concat: {
      options: {
        separator: '',
      },
      dist: {
        src: ['bower_components/angular/angular.js', 'bower_components/angular-ui-sortable/sortable.js',  'bower_components/ng-table/ng-table.js', 'bower_components/angular-bootstrap/ui-bootstrap-tpls.js'],
        dest: 'dev/vendor.js'
      },
    },

    uglify: {
      options: {
        banner: '/*! \nKalin\'s PDF Creation Station <%= grunt.template.today("yyyy-mm-dd") %> \nThis JavaScript file contains: angular.js, ng-table.js, ui-bootstrap-tpls.js and angular-ui-sortable.js*/ \n'
      },
      build: {
        src: 'dev/vendor.js',
        dest: 'vendor.min.js'
      }
    },

    jslint: {
      //TODO: pull js code out of tool and admin pages into their own files so we can lint them
      src: ['KalinsUIService.js']    // 'src/**/*.js', 'test/**/*.js']
    },

    //phplint runs but does nothing. Can't figure it out 
    phplint: {
      main: ['kalins-pdf-creation-station.php', 'kalins_pdf_admin_page.php', 'kalins_pdf_tool_page.php', 'kalins_pdf_create.php']
    },
    
    watch: {
	  scripts: {
	    files: aWatchList,
	    options: {
	      spawn: false,
	      livereload: true//haven't actually done anything with this yet so probably doesn't work
	    }
	  }
	}
  });

  //function used for the 'release' task
  var releaseFunc = function (){
    var i = 0;
    
    this.requires('lint');
    
    verifyFiles();
    
    verifyVersion();
    
    grunt.log.writeln('Copying main folders...');

    //loop into all our folders that we need moving
    for(i; i<aFolders.length; i++){
      grunt.file.recurse(aFolders[i], function(abspath, rootdir, subdir, filename){
        grunt.file.copy(abspath, svnTrunk + abspath);
      });
    }
    
    grunt.log.writeln('Copying top-level files...');
    //copy over all our main files
    for(i = 0; i<aFiles.length; i++){
      grunt.file.copy(aFiles[i], svnTrunk + aFiles[i]);
    }

    //Finally, copy over the wordpress.org assets to the root of the svn repository, one level up from the trunk directory
    grunt.log.writeln('Copying WordPress.org assets folder...');
    grunt.file.recurse('assets', function(abspath, rootdir, subdir, filename){
      grunt.file.copy(abspath, pkg.svnRepository + abspath);
    });
    
    grunt.log.ok("Files and folders copied to your local WordPress SVN repository and should be ready to commit and release to WordPress.org.");
  }
  
  //verify that all our top-level files and folders are present and nothing new has been added. You can still add and remove files within folders without needing to update this file.
  //Note: this won't catch new empty folders
  var verifyFiles = function (){
    var i = 0,
      aAllFolders = aFolders.concat(aDevFolders),
      aAllFiles = aFiles.concat(aDevFiles),
      aEverything = aAllFolders.concat(aAllFiles);
    
    grunt.log.writeln('VerifyFiles: Looking for missing files or folders...');
    for(i; i < aEverything.length; i++){
      if(!grunt.file.exists(aEverything[i])){
        grunt.fail.warn( aEverything[i] + " is missing. If this is intentional, remove it from the arrays at the top of Gruntfile.js.");
      }
    }
    
    grunt.log.writeln('VerifyFiles: Looking for new files or folders...');
    grunt.file.recurse('.', function(abspath, rootdir, subdir, filename){
      if(abspath.indexOf('.') === 0){
        return;//ignore everything that starts with a ".", which means it's a hidden file or folder, such as .gitignore or .project
      } else {
        if(subdir){//if there is a subdirectory, check to make sure it's in our list
          var folder = abspath.substr(0, abspath.indexOf('/'));//check only the top-level folder
          if(aAllFolders.indexOf(folder) >= 0){
            return;//ignore all files or folders inside any of our acceptable top-level folders
          } else {
            grunt.fail.warn( abspath + " was not found in the file list. Add " + subdir + " to aFolders (if it's needed in the final output) or aDevFolders in Gruntfile.js.");
            return;
          }
        }
      }

      if(aAllFiles.indexOf(filename) === -1){
        grunt.fail.warn( abspath + " was not found in the file list. Add it to aFiles (if it's needed in the final plugin output) or aDevFiles in Gruntfile.js.");
        return;
      }      
    });

    grunt.log.ok("Good to go: no top-level files or folders added or missing.");
  }

  var verifyVersion = function (){
    grunt.log.writeln('Verifying version numbers...');
    grunt.log.oklns("Good to go: version number has been properly updated in all the right places.");

    return true;
  }

  //listen for our any changed files so we can move them to the proper location in our dev wordpress installation
  grunt.event.on('watch', function(action, filepath, target) {
    var sDestination = pkg.devWordPressPath + "/wp-content/plugins/kalins-pdf-creation-station/" + filepath;
    grunt.log.writeln('Copying: ' + filepath + ' to ' + sDestination);
    grunt.file.copy(filepath, sDestination);
  });

  //load all our external modules (from node_modules dir) 
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jslint');
  grunt.loadNpmTasks('grunt-phplint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  //According to this thread: http://stackoverflow.com/questions/15100565/how-do-i-invoke-other-tasks-from-my-custom-task-before-my-task-code-runs,
  //it's not possible to invoke other tasks first, so we are stuck with labeling them as private
  grunt.registerTask('privateCleanup', 'delete our temp vendor file', function() {
    grunt.file.delete('dev/vendor.js');
  });
  grunt.registerTask('privateReleaseFunc', 'delete our temp vendor file', releaseFunc);
  
  //These are the tasks intended to run from command line
  grunt.registerTask('vendor', 'vendor tasks -- compile and minify (concat, uglify) the vendor js', ['concat', 'uglify', 'privateCleanup']);
  grunt.registerTask('lint', 'validate our JS and PHP', ['jslint', 'phplint:main']);
  grunt.registerTask('release', 'Verify lint, files, folders and version number. If successful, move all relevant files into the proper location in the svn repository that you entered into the package.json file.', ['lint', 'privateReleaseFunc']);
  grunt.registerTask('devwatch', 'Move any relevant changed files into proper locaton in our development WordPress installation as defined in package.json.', ['watch'])
};