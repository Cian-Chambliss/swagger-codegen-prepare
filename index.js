var _ = require('lodash');

var normalizeName = function(id) {
    return id.replace(/\.|\-|\{|\}/g, '_');
};

var getPathToMethodName = function(opts, m, path) {
    if (path === '/' || path === '') {
        return m;
    }

    // clean url path for requests ending with '/'
    var cleanPath = path.replace(/\/$/, '');

    var segments = cleanPath.split('/').slice(1);
    segments = _.transform(segments, function(result, segment) {
        if (segment[0] === '{' && segment[segment.length - 1] === '}') {
            segment = 'by' + segment[1].toUpperCase() + segment.substring(2, segment.length - 1);
        }
        result.push(segment);
    });
    var result = _.camelCase(segments.join('-'));
    return m.toLowerCase() + result[0].toUpperCase() + result.substring(1);
};

var getViewForSwagger2 = function(opts) {
    var swagger = opts.swagger;
    var methods = [];
    var authorizedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'COPY', 'HEAD', 'OPTIONS', 'LINK', 'UNLIK', 'PURGE', 'LOCK', 'UNLOCK', 'PROPFIND'];
    var data = {
        description: swagger.info.description,
        isSecure: swagger.securityDefinitions !== undefined,
        moduleName: opts.moduleName,
        className: opts.className,
        imports: opts.imports,
        domain: (swagger.schemes && swagger.schemes.length > 0 && swagger.host && swagger.basePath) ? swagger.schemes[0] + '://' + swagger.host + swagger.basePath.replace(/\/+$/g, '') : '',
        methods: [],
        definitions: []
    };

    _.forEach(swagger.paths, function(api, path) {
        var globalParams = [];
        /**
         * @param {Object} op - meta data for the request
         * @param {string} m - HTTP method name - eg: 'get', 'post', 'put', 'delete'
         */
        _.forEach(api, function(op, m) {
            if (m.toLowerCase() === 'parameters') {
                globalParams = op;
            }
        });
        _.forEach(api, function(op, m) {
            var M = m.toUpperCase();
            if (M === '' || authorizedMethods.indexOf(M) === -1) {
                return;
            }
            var secureTypes = [];
            if (swagger.securityDefinitions !== undefined || op.security !== undefined) {
                var mergedSecurity = _.merge([], swagger.security, op.security).map(function(security) {
                    return Object.keys(security);
                });
                if (swagger.securityDefinitions) {
                    for (var sk in swagger.securityDefinitions) {
                        if (mergedSecurity.join(',').indexOf(sk) !== -1) {
                            secureTypes.push(swagger.securityDefinitions[sk].type);
                        }
                    }
                }
            }
            var methodName = (op.operationId ? normalizeName(op.operationId) : getPathToMethodName(opts, m, path));
            // Make sure the method name is unique
            if (methods.indexOf(methodName) !== -1) {
                var i = 1;
                while (true) {
                    if (methods.indexOf(methodName + '_' + i) !== -1) {
                        i++;
                    } else {
                        methodName = methodName + '_' + i;
                        break;
                    }
                }
            }
            methods.push(methodName);

            var method = {
                path: path,
                className: opts.className,
                methodName: methodName,
                method: M,
                isGET: M === 'GET',
                isPOST: M === 'POST',
                summary: op.description || op.summary,
                externalDocs: op.externalDocs,
                isSecure: swagger.security !== undefined || op.security !== undefined,
                isSecureToken: secureTypes.indexOf('oauth2') !== -1,
                isSecureApiKey: secureTypes.indexOf('apiKey') !== -1,
                isSecureBasic: secureTypes.indexOf('basic') !== -1,
                parameters: [],
                headers: []
            };
            if (method.isSecure && method.isSecureToken) {
                data.isSecureToken = method.isSecureToken;
            }
            if (method.isSecure && method.isSecureApiKey) {
                data.isSecureApiKey = method.isSecureApiKey;
            }
            if (method.isSecure && method.isSecureBasic) {
                data.isSecureBasic = method.isSecureBasic;
            }
            var produces = op.produces || swagger.produces;
            if (produces) {
                method.headers.push({
                    name: 'Accept',
                    value: "'${produces.map(function(value) { return value; }).join(', ')}'",
                });
            }

            var consumes = op.consumes || swagger.consumes;
            if (consumes) {
                method.headers.push({ name: 'Content-Type', value: '\'' + consumes + '\'' });
            }

            var params = [];
            if (_.isArray(op.parameters)) {
                params = op.parameters;
            }
            params = params.concat(globalParams);
            _.forEach(params, function(parameter) {
                //Ignore parameters which contain the x-exclude-from-bindings extension
                if (parameter['x-exclude-from-bindings'] === true) {
                    return;
                }

                // Ignore headers which are injected by proxies & app servers
                // eg: https://cloud.google.com/appengine/docs/go/requests#Go_Request_headers
                if (parameter['x-proxy-header'] && !data.isNode) {
                    return;
                }
                if (_.isString(parameter.$ref)) {
                    var segments = parameter.$ref.split('/');
                    parameter = swagger.parameters[segments.length === 1 ? segments[0] : segments[2]];
                }
                parameter.camelCaseName = _.camelCase(parameter.name);
                if (parameter.enum && parameter.enum.length === 1) {
                    parameter.isSingleton = true;
                    parameter.singleton = parameter.enum[0];
                }
                if (parameter.in === 'body') {
                    parameter.isBodyParameter = true;
                } else if (parameter.in === 'path') {
                    parameter.isPathParameter = true;
                } else if (parameter.in === 'query') {
                    if (parameter['x-name-pattern']) {
                        parameter.isPatternType = true;
                        parameter.pattern = parameter['x-name-pattern'];
                    }
                    parameter.isQueryParameter = true;
                } else if (parameter.in === 'header') {
                    parameter.isHeaderParameter = true;
                } else if (parameter.in === 'formData') {
                    parameter.isFormParameter = true;
                }
                if (opts.convertType) {
                    parameter.__type = opts.convertType(parameter);
                }
                parameter.cardinality = parameter.required ? '' : '?';
                if (method.parameters.length !== 0) {
                    parameter.notFirstParameter = true;
                }
                method.parameters.push(parameter);
            });
            if (op.responses) {
                _.forEach(op.responses, function(response, r) {
                    var rVal = parseInt(r);
                    if (0 < rVal && rVal < 400) {
                        if (response.schema && !method.returnType) {
                            method.return = response.schema;
                            if (opts.convertType) {
                                method.return.__type = opts.convertType(response.schema);
                            }
                        }
                    }
                });
                if (!method.returnType && opts.defaultType) {
                    method.return = opts.defaultType;
                }
            }
            data.methods.push(method);
        });
    });

    _.forEach(swagger.definitions, function(definition, name) {
        if (opts.convertType) {
            data.definitions.push({
                name: name,
                description: definition.description,
                __type: opts.convertType(definition, swagger)
            });
        } else {
            data.definitions.push({
                name: name,
                description: definition.description,
            });
        }
    });

    return data;
};

var getViewForSwagger1 = function(opts) {
    var swagger = opts.swagger;
    var data = {
        description: swagger.description,
        moduleName: opts.moduleName,
        className: opts.className,
        domain: swagger.basePath ? swagger.basePath : '',
        methods: []
    };
    swagger.apis.forEach(function(api) {
        api.operations.forEach(function(op) {
            if (op.method === 'OPTIONS') {
                return;
            }
            var method = {
                path: api.path,
                className: opts.className,
                methodName: op.nickname,
                method: op.method,
                isGET: op.method === 'GET',
                isPOST: op.method.toUpperCase() === 'POST',
                summary: op.summary,
                parameters: op.parameters,
                headers: []
            };

            if (op.produces) {
                var headers = [];
                headers.value = [];
                headers.name = 'Accept';
                headers.value.push(op.produces.map(function(value) { return '\'' + value + '\''; }).join(', '));
                method.headers.push(headers);
            }

            op.parameters = op.parameters ? op.parameters : [];
            op.parameters.forEach(function(parameter) {
                parameter.camelCaseName = _.camelCase(parameter.name);
                if (parameter.enum && parameter.enum.length === 1) {
                    parameter.isSingleton = true;
                    parameter.singleton = parameter.enum[0];
                }
                if (parameter.paramType === 'body') {
                    parameter.isBodyParameter = true;
                } else if (parameter.paramType === 'path') {
                    parameter.isPathParameter = true;
                } else if (parameter.paramType === 'query') {
                    if (parameter['x-name-pattern']) {
                        parameter.isPatternType = true;
                        parameter.pattern = parameter['x-name-pattern'];
                    }
                    parameter.isQueryParameter = true;
                } else if (parameter.paramType === 'header') {
                    parameter.isHeaderParameter = true;
                } else if (parameter.paramType === 'form') {
                    parameter.isFormParameter = true;
                }
            });
            data.methods.push(method);
        });
    });
    return data;
};

exports.SwaggerPrepare = function(opts) {
    // For Swagger Specification version 2.0 value of field 'swagger' must be a string '2.0'
    return opts.swagger.swagger === '2.0' ? getViewForSwagger2(opts) : getViewForSwagger1(opts);
};