'use strict';

angular.module('webwalletApp')
  .value('jsqrcode', window.qrcode)
  .directive('qrScan', function (jsqrcode) {
    var URL, getUserMedia;

    URL = window.URL || window.webkitURL || window.mozURL || window.msURL;
    getUserMedia =
      navigator.getUserMedia || navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia || navigator.msGetUserMedia;
    if (getUserMedia) getUserMedia = getUserMedia.bind(navigator);

    return {
      link: link,
      restrict: 'E',
      require: '?ngModel',
      template: '<video class="qrscan-video"></video>',
      scope: {
        interval: '='
      }
    };

    function link(scope, element, attrs, ngModel) {
      var interval = scope.interval || 1000,
          video = element.find('.qrscan-video')[0],
          canvas = document.createElement('canvas'),
          context = canvas.getContext('2d'),
          stream, value;

      if (!ngModel)
        throw new Error('ng-model attribute is required');

      if (!getUserMedia)
        throw new Error('getUserMedia is not supported');

      initVideo();

      scope.$on('$destroy', function() {
        if (!stream) return;
        stream.stop();
        stream = null;
      });

      function initVideo() {
        getUserMedia({ video: true },
          function (vs) {
            stream = vs;
            window.addEventListener('loadedmetadata', initCanvas, true);
            video.src = (URL && URL.createObjectURL(vs)) || vs;
          },
          function () {
            scope.$apply(function () {
              ngModel.$setViewValue(null);
            });
          }
        );
      }

      function initCanvas() {
        video.play();
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        jsqrcode.callback = function (val) {
          value = val;
        };
        setTimeout(intervalTick, interval);
        window.removeEventListener('loadedmetadata', initCanvas, true);
      }

      function intervalTick() {
        if (value && value !== 'error decoding QR Code') {
          video.pause();
          stream.stop();
          scope.$apply(function () {
            ngModel.$setViewValue(value);
          });
        } else if (stream) {
          snapshotVideo();
          setTimeout(intervalTick, interval);
        }
      }

      function snapshotVideo() {
        context.drawImage(
          video,
          0, 0, video.videoWidth, video.videoHeight,
          0, 0, canvas.width, canvas.height
        );
        jsqrcode.decode(canvas.toDataURL());
      }
    }
  });
