/*global angular*/

angular.module('webwalletApp').factory('ItemStorage', function (
    $rootScope,
    storage) {

    'use strict';

    /**
     * Item storage -- persist a list of objects in localStorage
     *
     * Initialize new item storage.
     *
     * Passed `options` object has these mandatory properties:
     * - {Function} `type`: A class that implements a method `#deserialize()`
     *      that converts a String to class instance.
     * - {String} `version`: Data version.  Stored in localStorage under the
     *      key read from `options.keyVersion`.
     * - {String} `keyItems`: Key under which the items will be stored.
     *      Used like this: `localStorage[keyItems] = items`.
     * - {String} `keyVersion`: Key under which the data version will be
     *      stored.  Used like this: `localStorage[keyVersion] = version`.
     *
     * @param {Object} options  Options in format:
     *                          {type: Function, version: String,
     *                          keyItems: String, keyVersion: String}
     * @constructor
     */
    function ItemStorage(options) {
        this._type = options.type;
        this._version = options.version;
        this._keyItems = options.keyItems;
        this._keyVersion = options.keyVersion;
    }

    ItemStorage.prototype._type = null;
    ItemStorage.prototype._version = null;
    ItemStorage.prototype._keyItems = null;
    ItemStorage.prototype._keyVersion = null;

    /**
     * Restore the list of item objects from localStorage and start watching it
     * for changes.  If a change occurs, the changed list is immediately stored
     * in the localStorage.
     *
     * @return {Promise}  Return value of Angular's `$rootScope.$watch()`
     */
    ItemStorage.prototype.init = function () {
        return this._watch(
            this._load()
        );
    };

    /**
     * Restore the data from localStorage and deserialize it, so that the
     * output is a list of item objects.
     *
     * @return {Array}  Item list
     */
    ItemStorage.prototype._load = function () {
        return this._deserialize(
            this._restore()
        );
    };

    /**
     * Watch passed list of item objects for changes.
     *
     * If a change occurs, the changed list is immediately stored
     * in the localStorage.
     *
     * @param {Array} items  Item list
     */
    ItemStorage.prototype._watch = function (items) {
        $rootScope.$watch(
            function () {
                return this._serialize(items);
            }.bind(this),
            function (data) {
                this._store(data);
            }.bind(this),
            true // deep compare
        );
        return items;
    };

    /**
     * Serialize a list of item objects to a list of serialized item objects
     * (strings).
     *
     * @param {Array} items        Item list
     * @return {Array of Strings}  Serialized items
     */
    ItemStorage.prototype._serialize = function (items) {
        return items.map(function (item) {
            return item.serialize();
        });
    };

    /**
     * Deserialize an item list -- return a list of item objects from passed
     * list of serialized item objects (strings).
     *
     * @param {Array of Strings}  data  Serialized items
     * @return {Array}                  Item list
     */
    ItemStorage.prototype._deserialize = function (data) {
        return data.map(function (item) {
            return this._type.deserialize(item);
        }.bind(this));
    };

    /**
     * Store passed list of serialized item objects to localStorage.
     *
     * @param {Array of Strings}  data  Serialized items
     * @return {String}                 The entire list serialized to JSON
     */
    ItemStorage.prototype._store = function (data) {
        var json = JSON.stringify(data);
        storage[this._keyItems] = json;
        storage[this._keyVersion] = this._version;
        return json;
    };

    /**
     * Restore data from the localStorage -- the output is a list of
     * serialized item objects.
     *
     * @return {Array of Strings}  Serialized items
     */
    ItemStorage.prototype._restore = function () {
        var items = storage[this._keyItems],
            version = storage[this._keyVersion];

        if (items && version === this._version) {
            return JSON.parse(items);
        }
        return [];
    };

    return ItemStorage;

});
