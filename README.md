# @squirrel-forge/sass-base64-loader
A node sass function for importing files as base64 encoded strings built for the new [sass js api](https://sass-lang.com/documentation/js-api) must be used with the new [sass](https://www.npmjs.com/package/sass) package.
Made to be compatible with node ^10.0.0, might work on higher versions, but currently not supported or tested.

## Installation

```
npm i @squirrel-forge/sass-base64-loader
```

## Usage

### Sass function

Sass function signature: ```base64load($source,$mimetype)```

 - **$source** : *string* - Url, absolute or relative path
   (*Note:* Until sass context options are available, a relative path will be resolved relative to the *Base64loadOptions.cwd* option.)
 - **$mimetype** : *string* - The *$source* file's mimetype
   (*Note:* This can be made optional by using the *Base64loadOptions.detect* or *Base64loadOptions.remote* option see [remote file loading and mime detection](#remote-file-loading-and-mimetype-detection) for details.)

**Returns** : *quoted string* - Contains the given base64 encoded data uri  

#### Source scss

```scss
:root {
  --image-loading-gif: #{url(base64load('cwd/images/loading.gif','image/gif'))};
}
```

#### Resulting css

```css
:root {
  --image-loadgin-gif: url("data:image/gif;base64,R0lGODlhdgJ9AvYAAFZWVre3t0VFRdzc3DMzM...");
}
```

### Plugin usage:

```javascript
const sass = require( 'sass' );
const base64Loader = require( '@squirrel-forge/sass-base64-loader' );

// Classic way, calling the factory in place with options
const sassOptions = { functions : {} };
sassOptions.functions[ base64Loader.signature ] = base64Loader( /* null|Base64loadOptions */ ).callback;

// Destructuring the result object
const { signature, callback } = base64Loader( /* null|Base64loadOptions */ );
sassOptions.functions[ signature ] = callback;

// Plugin way, supply the sass options as second argument
// It will create the functions property if required and add the signature and function.
const sassOptions = {};
base64Loader( /* null|Base64loadOptions */, sassOptions );

// If not using the remote option you may use the sync compile which requires an explicit mimetype as second argument
const result = sass.compile( scssFilename, sassOptions );

// OR when using the async api you may use the remote option and automatically detect mimetypes
const result = await sass.compileAsync( scssFilename, sassOptions );
```

#### Options

```javascript
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
 * @typedef {Object} Base64loadOptions
 * @property {boolean} detect - Auto detect file mimetypes, default: false
 * @property {boolean} remote - Load files from http urls, default: false
 * @property {null|string} cwd - Base path for resolving relative paths, default: null > process.cwd()
 * @property {null|Object|Base64loadStringCache} cache - Caching object, default: {}
 */
```

### Remote file loading and mimetype detection

Both options require use of the async *sass.compileAsync* api that supports async functions.
If you wish to load data from urls you need to set *Base64loadOptions.remote* = *true*
To automatically detect mimetypes set *Base64LoadOptions.detect* = *true*

#### Requirements

All dependencies are loose and will only be required at runtime if required through the *Base64loadOptions.remote* or *Base64loadOptions.detect* option.

Remote loading requires [node-fetch@^2.x.x](https://www.npmjs.com/package/node-fetch/v/2.6.7) to function in a *node@^10.x.x* environment, on higher node versions you should be able to use newer versions.

#### Optional argument $mimetype

The *$mimetype* function argument becomes optional once you have enabled the *Base64loadOptions.detect* option or *Base64loadOptions.remote* loading and the async handler is used, but it requires [file-type@^16.x.x](https://www.npmjs.com/package/file-type/v/16.5.3) to function in a *node@^10.x.x* environment, on higher node versions you should be able to use newer versions.

## Issues

If you encounter any issues, please report [here](https://github.com/squirrel-forge/node-sass-base64-loader/issues).

---
Check the sourcecode on [github](https://github.com/squirrel-forge/node-sass-base64-loader) for extensive comments.
