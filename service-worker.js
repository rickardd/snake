var version = 'v1::';

self.addEventListener("install", function (event) {
    console.log('WORKER: install event in progress.');
    event.waitUntil(
        caches
            .open(version + 'fundamentals')
            .then(function (cache) {
                return cache.addAll([
                    '/index.html',
                    '/about.html'
                ]);
            })
            .then(function () {
                console.log('WORKER: install completed');
            })
    );
});


self.addEventListener("fetch", function (event) {
    console.log('WORKER: fetch event in progress.');

    if (event.request.method !== 'GET') {
        console.log('WORKER: fetch event ignored.', event.request.method, event.request.url);
        return;
    }

    event.respondWith(
        caches
            .match(event.request)
            .then(function (cached) {
                var networked = fetch(event.request)
                    .then(
                        response => fetchedFromNetwork(response, event),
                        unableToResolve
                    )
                    .catch(unableToResolve);

                // This will return cached version if it exist, else network version.
                // Might prevent installed apps to not be updated when changes has been made. 
                console.log('WORKER: fetch event', cached ? '(cached)' : '(network)', event.request.url);

                return cached || networked;
            })
    );
});

self.addEventListener("activate", function (event) {
    console.log('WORKER: activate event in progress.');
    event.waitUntil(
        caches
            .keys()
            .then(function (keys) {
                return Promise.all(
                    keys
                        .filter(function (key) {
                            return !key.startsWith(version);
                        })
                        .map(function (key) {
                            return caches.delete(key);
                        })
                );
            })
            .then(function () {
                console.log('WORKER: activate completed.');
            })
    );
});


function fetchedFromNetwork(response, event) {
    var cacheCopy = response.clone();
    console.log('WORKER: fetch response from network.', event.request.url);
    caches
        .open(version + 'pages')
        .then(function add(cache) {
            cache.put(event.request, cacheCopy);
        })
        .then(function () {
            console.log('WORKER: fetch response stored in cache.', event.request.url);
        });

    return response;
}

function unableToResolve() {
    console.log('WORKER: fetch request failed in both cache and network.');
    return new Response('<h1>Serpiente Unavailable</h1>', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
            'Content-Type': 'text/html'
        })
    });
}