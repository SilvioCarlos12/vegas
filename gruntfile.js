var semver = require('semver'),
    format = require('util').format;

module.exports = function(grunt) {

    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        banner: [
            ' // ----------------------------------------------------------------------------',
            ' // <%= pkg.description %>',
            ' // v<%= pkg.version %> - released <%= grunt.template.today("yyyy-mm-dd HH:MM") %>',
            ' // Licensed under the MIT license.',
            ' // http://vegas.jaysalvat.com/',
            ' // ----------------------------------------------------------------------------',
            ' // Copyright (C) 2010-<%= grunt.template.today("yyyy") %> Jay Salvat',
            ' // http://jaysalvat.com/',
            ' // ----------------------------------------------------------------------------',
            '\n'
        ].join('\n'),

        jshint: {
            files: ['gruntfile.js', 'src/**/*.js']
        },

        uglify: {
            options: {
                banner: '<%= banner %>'
            },
            js: {
                options: {
                    mangle: false,
                    compress: false,
                    beautify: true
                },
                src: 'src/jquery.vegas.js',
                dest: 'dist/jquery.vegas.js'
            },
            jsmin: {
                options: {
                    mangle: true,
                    compress: true
                },
                src: 'dist/jquery.vegas.js',
                dest: 'dist/jquery.vegas.min.js'
            }
        },

        cssmin: {
            minify: {
                src: 'src/jquery.vegas.css',
                dest: 'dist/jquery.vegas.min.css'
            }
        },

        exec: {
            copyAssets: {
                cmd: [
                    'cp -r src/images dist/',
                    'cp -r src/overlays dist/',
                    'cp -r src/jquery.vegas.css dist/jquery.vegas.css'
                ].join(' && ')
            },
            publish: {
                cmd: [
                    'cp -r src/images dist/',
                    'cp -r src/overlays dist/',
                    'cp -r src/jquery.vegas.css dist/jquery.vegas.css',
                    'cp -r dist/ tmp/',
                    'zip -rj tmp/vegas.zip tmp/jquery.vegas.js',
                    'zip -rj tmp/vegas.zip tmp/jquery.vegas.min.js',
                    'zip -rj tmp/vegas.zip tmp/jquery.vegas.css',
                    'zip -rj tmp/vegas.zip tmp/jquery.vegas.min.css',
                    'zip -rj tmp/vegas.zip tmp/images',
                    'zip -rj tmp/vegas.zip tmp/overlays',
                    'git checkout gh-pages',
                    'rm -rf releases/latest/',
                    'cp -r tmp/ releases/<%= pkg.version %>/',
                    'cp -r tmp/ releases/latest/',
                    'git add -A releases/<%= pkg.version %>',
                    'git add -A releases/latest',
                    'git commit -m "Published v<%= pkg.version %>."',
                    'git push',
                    'git checkout -',
                    'rm -rf tmp/'
                ].join(' && ')
            },
            gitFailIfDirty: {
                cmd: 'test -z "$(git status --porcelain)"'
            },
            gitAdd: {
                cmd: 'git add .'
            },
            gitCommit: {
                cmd: function(message) {
                    return format('git commit -m "%s"', message);
                }
            },
            gitTag: {
                cmd: function(version) {
                    return format('git tag v%s -am "%s"', version, version);
                }
            },
            gitPush: {
                cmd: [
                    'git push',
                    'git push --tags'
                ].join(' && ')
            }
        }
    });

    grunt.loadNpmTasks('grunt-exec');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-cssmin');

    grunt.registerTask('build',   ['jshint', 'uglify', 'cssmin']);
    grunt.registerTask('publish', ['exec:publish']);
    grunt.registerTask('default', ['build']);

    grunt.registerTask('release', 'Release lib.', function(version) {
        var pkg = grunt.file.readJSON('package.json');

        version = semver.inc(pkg.version, version) || version;

        if (!semver.valid(version) || semver.lte(version, pkg.version)) {
            grunt.fatal('Invalid version.');
        }

        pkg.version = version;
        grunt.config.data.pkg = pkg;

        grunt.task.run([
            'exec:gitFailIfDirty',
            'build',
            'metadata:' + version,
            'manifests:' + version,
            'exec:gitAdd',
            'exec:gitCommit:' + version,
            'exec:gitTag:' + version,
            'exec:gitPush',
            'exec:publish'
        ]);
    });

    grunt.registerTask('manifests', 'Update manifests.', function(version) {
        var _   = grunt.util._,
            pkg = grunt.file.readJSON('package.json'),
            cpt = grunt.file.readJSON('component.json');

        if (!semver.valid(version)) {
            grunt.fatal('Invalid version');
        }

        pkg.version = version;

        cpt = JSON.stringify(_.extend(cpt,
            _.omit(pkg, 'dependencies', 'devDependencies')
        ), null, 2);

        pkg = JSON.stringify(pkg, null, 2);

        grunt.file.write('package.json', pkg);
        grunt.file.write('component.json', cpt);
    });

    grunt.registerTask('metadata', 'Create metadata file.', function(version) {
        var metadata = {
            'date': grunt.template.today("yyyy-mm-dd HH:MM:ss"),
            'version': version
        };

        grunt.file.write('dist/metadata.json', JSON.stringify(metadata, null, 2));
    });
};