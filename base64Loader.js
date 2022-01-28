/**
 * Requires
 */
const fs = require( 'fs' );
const path = require( 'path' );
const sass = require( 'sass' );

/**
 * Require optional
 * @private
 * @param {string} name - Module name
 * @param {string} version - Version for fatal notice
 * @param {boolean} fatal - Throw if not available
 * @throws Error
 * @return {null|*} - Module if available
 */
function requireOptional( name, version, fatal = false ) {
    let module = null;
    try {
        module = require( name );
    } catch ( err ) {
        if ( fatal ) throw new Error( `Requires ${name}@${version}` );
    }
    return module;
}

/**
 * String is url
 * @private
 * @param {string} str - Possible url string
 * @return {boolean} - True if valid url
 */
function isUrl( str ) {
    let url;
    try {
        url = new URL( str );
    } catch ( e ) {
        return false;
    }
    return url.protocol === 'http:' || url.protocol === 'https:';
}

/**
 * Get from cache
 * @private
 * @param {string} source - Source
 * @param {Object} cache - Cache object
 * @return {null|string} - Cached string if available
 */
function _internal_base64load_fromCache( source, cache ) {
    const value = cache.get ? cache.get( source ) : cache[ source ];
    if ( value ) return value;
    return null;
}

/**
 * Write to cache
 * @private
 * @param {string} source - Source
 * @param {string} value - Value to save
 * @param {Object} cache - Cache object
 * @return {void}
 */
function _internal_base64load_toCache( source, value, cache ) {
    if ( cache.set ) {
        cache.set( source, value );
    } else {
        cache[ source ] = value;
    }
}

/**
 * @typedef {Object} Base64loadFileResult
 * @property {string} file - File or url
 * @property {Buffer} file_buffer - File buffer instance
 * @property {null|string} mimetype - File mimetype
 */

/**
 * Resolve source sync
 * @private
 * @param {string} source - Source
 * @param {Object|Base64loadOptions} options - Loader options
 * @throws Error
 * @return {Object|Base64loadFileResult} - File result
 */
function _internal_base64load_resolve_source_sync( source, options ) {

    // Resolve local file path
    const cwd = options.cwd || process.cwd();

    // By default assume absolute path
    let file = source;

    // Resolve relative path
    if ( !source.startsWith( path.sep ) ) {
        file = path.resolve( cwd, source );
    }

    // Check exists
    let exists;
    try {
        exists = fs.lstatSync( file ).isFile();
    } catch ( e ) {
        exists = false;
    }
    if ( !exists ) {
        throw new Error( `base64load(${source},$mimetype) File not found: ${file}` );
    }

    // Read file
    const file_buffer = fs.readFileSync( file );
    return { file : file, file_buffer : file_buffer, mimetype : null };
}

/**
 * Get mimetype from info
 * @private
 * @param {string} source - Source
 * @param {null|string} mime - Mimetype
 * @param {null|Buffer} file_buffer - File buffer
 * @param {null|string} file - File path
 * @throws Error
 * @return {Promise<string>} - Mimetype string
 */
async function _internal_base64load_get_mimetype_async( source, mime, file_buffer = null, file = null ) {

    // Detect mimetype
    if ( ( file || file_buffer ) && ( !mime || !mime.length ) ) {

        // Get file-type or throw with requirement
        const fileType = requireOptional( 'file-type', '^16.5.3', true );

        // Check buffer
        if ( file_buffer ) {
            const buffer_type = await fileType.fromBuffer( file_buffer );
            if ( buffer_type && buffer_type.mime ) {
                mime = buffer_type.mime;
            }
        }

        // Let's check again
        if ( file && ( !mime || !mime.length ) ) {
            const file_type = await fileType.fromFile( file );
            if ( file_type && file_type.mime ) {
                mime = file_type.mime;
            }
        }
    }

    // Fail check
    if ( !mime || !mime.length ) {
        throw new Error( `base64load(${source},$mimetype) Failed to detect $mimetype from $source` );
    }
    return mime;
}

/**
 * Resolve source async
 * @private
 * @param {string} source - Source
 * @param {null|string} mime - Mimetype
 * @param {Object|Base64loadOptions} options - Loader options
 * @throws Error
 * @return {Promise<Object|Base64loadFileResult>} - File result
 */
async function _internal_base64load_resolve_source_async( source, mime, options ) {
    let buf, file_path = null;
    if ( isUrl( source ) ) {

        // Remote loading must be active
        if ( !options.remote ) {
            throw new Error( `base64load(${source},$mimetype) To use remote url loading, set remote = true in your options` );
        }

        // Get node-fetch or throw with requirement
        const fetch = requireOptional( 'node-fetch', '^2.6.7', true );

        // Fetch file form url
        let result;
        try {
            result = await fetch( source );
        } catch ( err ) {
            throw new Error( `base64load(${source},$mimetype) Internal error fetching $source: ` + err );
        }

        // Not a valid result
        if ( !result || !result.ok ) {
            const status_text = result ? ' ' + result.status + '#' + result.statusText : '';
            throw new Error( `base64load(${source},$mimetype) Error${status_text} while fetching $source` );
        }

        // Use result and content-type and mime but only if net set allowing the argument value to prevail
        buf = await result.buffer();
        if ( !mime || !mime.length ) {
            mime = result.headers.get( 'content-type' );
        }

    } else {

        // Default get sync for local files
        const { file, file_buffer } = _internal_base64load_resolve_source_sync( source, options );
        buf = file_buffer;
        file_path = file;
    }

    // Detect mimetype if required
    mime = await _internal_base64load_get_mimetype_async( source, mime, buf, file_path );

    // Return data
    return { file : source, file_buffer : buf, mimetype : mime };
}

/**
 * Get base64 sass string from local file
 * @private
 * @param {string} source - Source
 * @param {null|string} mime - Mime
 * @param {Base64loadOptions} options - Loader options
 * @return {sass.SassString} - Sass string
 */
function _internal_base64load_sync( source, mime, options ) {

    // Check cache
    const cached = options.cache ? _internal_base64load_fromCache( source, options.cache ) : null;
    if ( cached ) {
        return new sass.SassString( cached );
    }

    // Resolve source
    const { file_buffer } = _internal_base64load_resolve_source_sync( source, options );

    // Output the result
    const output = `"data:${mime};base64,${file_buffer.toString( 'base64' )}"`;
    options.cache && _internal_base64load_toCache( source, output, options.cache );
    return new sass.SassString( output );
}

/**
 * Get base64 sass string from local or remote file
 * @private
 * @param {string} source - Source
 * @param {null|string} mime - Mime
 * @param {Base64loadOptions} options - Loader options
 * @return {Promise<sass.SassString>} - Sass string
 */
async function _internal_base64load_async( source, mime, options ) {

    // Check cache
    const cached = options.cache ? _internal_base64load_fromCache( source, options.cache ) : null;
    if ( cached ) {
        return new sass.SassString( cached );
    }

    // Resolve source
    const { file_buffer, mimetype } = await _internal_base64load_resolve_source_async( source, mime, options );

    // Output the result
    const output = `"data:${mimetype};base64,${file_buffer.toString( 'base64' )}"`;
    options.cache && _internal_base64load_toCache( source, output, options.cache );
    return new sass.SassString( output );
}

/**
 * @typedef {Object} Base64loadArguments
 * @property {string} source - Source
 * @property {null|string} mime - Mimetype
 */

/**
 * Get valid arguments from function input
 * @private
 * @param {Array} input - Sass function arguments
 * @param {boolean} sync - Sync mode, default: true
 * @throws Error
 * @return {Object|Base64loadArguments} - Valid arguments
 */
function _internal_base64load_valid_arguments( input, sync = true ) {

    // $source must be a string
    if ( !( input[ 0 ] instanceof sass.SassString ) ) {
        throw new Error( 'base64load($source,$mimetype) Invalid $source argument type' );
    }

    // Source must have a length
    const source = input[ 0 ].assertString( 'source' ).text;
    if ( !source.length ) {
        throw new Error( 'base64load($source,$mimetype) Invalid $source argument' );
    }

    // Check source for url, requires remote and async variant
    if ( sync && isUrl( source ) ) {
        throw new Error( `base64load(${source},$mimetype) To use the async variant for url loading, set remote = true in your options` );
    }

    // $mimetype must be null or not empty in async and not empty in sync mode
    const mime = input[ 1 ] === sass.sassNull ? null : input[ 1 ].assertString( 'mime' ).text;
    if ( sync && ( !mime || !mime.length ) || mime && ( typeof mime !== 'string' || !mime.length ) ) {
        throw new Error( `base64load(${source},$mimetype) Requires $mimetype argument` + ( sync ? ' in sync mode' : '' ) );
    }

    // Return parsed
    return { source, mime };
}

/**
 * @callback Base64loadStringCacheGetter
 * @param {string} key - Cache key
 * @return {null|string} - Value if available
 */

/**
 * @callback Base64loadStringCacheSetter
 * @param {string} key - Cache key
 * @param {string} value - Cache value
 * @return {void}
 */

/**
 * @typedef {Object} Base64loadStringCache
 * @property {Function|Base64loadStringCacheGetter} get - Get value from key
 * @property {Function|Base64loadStringCacheSetter} set - Set key with value
 */

/**
 * @typedef {Object} Base64loadOptions
 * @property {boolean} detect - Auto detect file mimetypes, default: false
 * @property {boolean} remote - Load files from http urls, default: false
 * @property {null|string} cwd - Base path for resolving relative paths, default: null > process.cwd()
 * @property {null|Object|Base64loadStringCache} cache - Caching object, default: {}
 */

/**
 * Base64load default options
 * @type {Object|Base64loadOptions}
 */
const BASE64LOAD_DEFAULT_OPTIONS = {
    detect : false,
    remote : false,
    cwd : null,
    cache : {},
};

/**
 * Sass function signature
 * @type {string}
 */
const SASS_FUNCTION_SIGNATURE = 'base64load($source,$mimetype:null)';

/**
 * Sass base64load factory
 * @param {Object|Base64loadOptions} options - Loader options
 * @param {null|Object} sassOptions - Sass options to add function to
 * @return {{signature: string, callback: (function(Array): sass.SassString)}} - Sass custom function plugin info
 */
module.exports = function base64Loader( options = null, sassOptions = null ) {

    // Get default options
    const local_options = { ...BASE64LOAD_DEFAULT_OPTIONS };

    // Assign custom options
    if ( options !== null && typeof options === 'object' ) {
        Object.assign( local_options, options );
    }

    /**
     * Load source sync
     * @param {Array} input - Sass function arguments
     * @throws Error
     * @return {sass.SassString} - Encoded value
     */
    const base64loadSync = function base64loadSync( input ) {
        const { source, mime } = _internal_base64load_valid_arguments( input );

        // Attempt load the source
        const result = _internal_base64load_sync( source, mime, local_options );

        // Check the result to be sure
        if ( !( result instanceof sass.SassString ) ) {
            throw new Error( `base64load(${source},${mime || 'null'}) Invalid result type` );
        }
        return result;
    };

    /**
     * Load source async
     * @param {Array} input - Sass function arguments
     * @throws Error
     * @return {Promise<sass.SassString>} - Encoded value
     */
    const base64loadAsync = async function base64loadAsync( input ) {
        const { source, mime } = _internal_base64load_valid_arguments( input, false );

        // Attempt load the source
        const result = await _internal_base64load_async( source, mime, local_options );

        // Check the result to be sure
        if ( !( result instanceof sass.SassString ) ) {
            throw new Error( `base64load(${source},${mime || 'null'}) Invalid result type` );
        }
        return result;
    };

    // Output format
    const handler = {
        signature : SASS_FUNCTION_SIGNATURE,
        callback : local_options.remote || local_options.detect ? base64loadAsync : base64loadSync,
    };

    // Add to sassOptions functions property
    if ( sassOptions !== null ) {

        // Expect at least some sort of object
        if ( typeof sassOptions !== 'object' ) {
            throw new Error( 'The sassOptions argument must be an object' );
        }

        // Create functions object if it does not exist
        if ( typeof sassOptions.functions !== 'object' ) {
            sassOptions.functions = {};
        }

        // Make sure the signature is not defined yet
        if ( sassOptions.functions[ SASS_FUNCTION_SIGNATURE ] ) {
            throw new Error( 'Sass function signature already defined' );
        }

        // Set function for signature
        sassOptions.functions[ SASS_FUNCTION_SIGNATURE ] = handler.callback;
    }

    // Return sass custom function information
    return handler;
};

/**
 * Export sass function signature
 * @type {string}
 */
module.exports.signature = SASS_FUNCTION_SIGNATURE;
