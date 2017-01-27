/**
 * Grunt: The JavaScript Task Runner
 * 
 */
module.exports = function (grunt) {
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.initConfig({
        jshint: {
            all: ['Gruntfile.js', 'api_v1/**/*.js'],
            options: {
                esversion: 6
            }
        }
    });
};