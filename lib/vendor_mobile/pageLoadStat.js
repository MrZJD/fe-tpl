/*
    综合利用cookie记录上一页离开时间方式和window.performance方法
    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

         http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

    See the source code here:
        https://github.com/stevesouders/episodes.git

    Embed this snippet in your page:
        <script async defer src="/js/episodes.js"></script>

    For more complex use of EPISODES you might need to add these stub functions:
        <script>
        var EPISODES = EPISODES || {};
        EPISODES.q = [];                      // command queue
        EPISODES.mark = function(mn, mt) { EPISODES.q.push( ["mark", mn, mt || new Date().getTime()] ); };
        EPISODES.measure = function(en, st, en) { EPISODES.q.push( ["measure", en, st, en || new Date().getTime()] ); };
        </script>
        <script async defer src="/js/episodes.js"></script>

    */

import gjReport from './report'

var EPISODES = EPISODES || {} // EPISODES namespace
EPISODES.q = EPISODES.q || [] // command queue

EPISODES.setDefault = function (param, val) {
    if (typeof (EPISODES[param]) === 'undefined') {
        EPISODES[param] = val
    }

    return EPISODES[param]
}

// OPTIONS
EPISODES.setDefault('bResourceTimingAgg', 1) // 1 == include Resource Timing aggregate stats.
EPISODES.setDefault('autorun', 1) // 1 == finish collecting metrics at window.onload

// other settings
EPISODES.targetOrigin = document.location.protocol + '//' + document.location.hostname
EPISODES.bPostMessage = (typeof (window.postMessage) !== 'undefined')
EPISODES.version = '0.3'

EPISODES.init = function () {
    EPISODES.bDone = false
    EPISODES.marks = {}
    EPISODES.measures = {}
    EPISODES.starts = {} // We need to save the starts so that given a measure we can say the epoch times that it began and ended.
    EPISODES.hResourceTiming = undefined
    EPISODES.findStartTime()
    EPISODES.addEventListener('beforeunload', EPISODES.beforeUnload, false)

    // Process any commands that have been queued up while episodes.js loaded asynchronously.
    EPISODES.processQ()

    if (document.readyState == 'complete') {
        // The page is ALREADY loaded - start EPISODES right now.
        if (typeof (performance) !== 'undefined' && typeof (performance.timing) !== 'undefined' &&
                typeof (performance.timing['loadEventEnd']) !== 'undefined') {
            // Fill in predefined marks from Nav Timing:
            EPISODES.mark('firstbyte', performance.timing.responseStart)
            EPISODES.mark('onload', performance.timing.loadEventEnd)
        }
        if (EPISODES.autorun) {
            EPISODES.done()
        }
    } else {
        // Start EPISODES on onload.
        EPISODES.addEventListener('load', EPISODES.onload, false)
    }
}

// Process any commands in the queue.
// The command queue is used to store calls to the API before the full script has been loaded.
EPISODES.processQ = function () {
    var len = EPISODES.q.length
    for (var i = 0; i < len; i++) {
        var aParams = EPISODES.q[i]
        var cmd = aParams[0]
        if (cmd === 'mark') {
            EPISODES.mark(aParams[1], aParams[2])
        } else if (cmd === 'measure') {
            EPISODES.measure(aParams[1], aParams[2], aParams[3])
        } else if (cmd === 'done') {
            EPISODES.done(aParams[1])
        }
    }
}

// Set a time marker (typically the beginning of an episode).
EPISODES.mark = function (markName, markTime) {
    // EPISODES.dprint("EPISODES.mark: " + markName + ", " + markTime);

    if (!markName) {
        // EPISODES.dprint("Error: markName is undefined in EPISODES.mark.");
        return
    }

    EPISODES.marks[markName] = parseInt(markTime || new Date().getTime())

    if (EPISODES.bPostMessage) {
        window.postMessage('EPISODES:mark:' + markName + ':' + markTime, EPISODES.targetOrigin)
    }

    // Special marks that we look for:
    if (markName === 'firstbyte') {
        EPISODES.measure('backend', 'starttime', 'firstbyte')
    } else if (markName === 'onload') {
        EPISODES.measure('frontend', 'firstbyte', 'onload')
        EPISODES.measure('pageLoadTime', 'starttime', 'onload')
    } else if (markName === 'done') {
        EPISODES.measure('totalLoadTime', 'starttime', 'done')
    }
}

// Measure an episode.
EPISODES.measure = function (episodeName, startNameOrTime, endNameOrTime) {
    // EPISODES.dprint("EPISODES.measure: " + episodeName + ", " + startNameOrTime + ", " + endNameOrTime);

    if (!episodeName) {
        // EPISODES.dprint("Error: episodeName is undefined in EPISODES.measure.");
        return
    }

    var startEpochTime
    if (typeof (startNameOrTime) === 'undefined') {
        if (typeof (EPISODES.marks[episodeName]) === 'number') {
            // If no startName is specified, then use the episodeName as the start mark.
            startEpochTime = EPISODES.marks[episodeName]
        } else {
            // Create a "measure" that is this exact point in time?
            startEpochTime = new Date().getTime()
        }
    } else if (typeof (EPISODES.marks[startNameOrTime]) === 'number') {
        // If a mark with this name exists, use that.
        startEpochTime = EPISODES.marks[startNameOrTime]
    } else if (typeof (startNameOrTime) === 'number') {
        // Assume a specific epoch time is provided.
        startEpochTime = startNameOrTime
    } else {
        // EPISODES.dprint("Error: unexpected startNameOrTime in EPISODES.measure: " + startNameOrTime);
        return
    }

    var endEpochTime
    if (typeof (endNameOrTime) === 'undefined') {
        endEpochTime = new Date().getTime()
    } else if (typeof (EPISODES.marks[endNameOrTime]) === 'number') {
        // If a mark with this name exists, use that.
        endEpochTime = EPISODES.marks[endNameOrTime]
    } else if (typeof (endNameOrTime) === 'number') {
        endEpochTime = endNameOrTime
    } else {
        // EPISODES.dprint("Error: unexpected endNameOrTime in EPISODES.measure: " + endNameOrTime);
        return
    }

    EPISODES.starts[episodeName] = parseInt(startEpochTime)
    EPISODES.measures[episodeName] = parseInt(endEpochTime - startEpochTime)

    if (EPISODES.bPostMessage) {
        window.postMessage('EPISODES:measure:' + episodeName + ':' + startEpochTime + ':' + endEpochTime, EPISODES.targetOrigin)
    }
}

// In the case of Ajax or post-onload episodes, call "done()" to signal the end of episodes.
EPISODES.done = function (callback) {
    EPISODES.bDone = true

    EPISODES.mark('done')

    if (EPISODES.bResourceTimingAgg) {
        EPISODES.measureResources()
    }

    if (EPISODES.bPostMessage) {
        window.postMessage('EPISODES:done', EPISODES.targetOrigin)
    }

    if (typeof (callback) === 'function') {
        callback()
    }
}

// Use various techniques to determine the time at which this page started.
EPISODES.findStartTime = function () {
    var startTime = EPISODES.findStartWebTiming() || EPISODES.findStartCookie()
    if (startTime) {
        EPISODES.mark('starttime', startTime)
    }
}

// Find the start time from the Web Timing "performance" object.
EPISODES.findStartWebTiming = function () {
    var startTime = undefined

    var performance = window.performance

    if (typeof (performance) !== 'undefined' && typeof (performance.timing) !== 'undefined' && typeof (performance.timing['navigationStart']) !== 'undefined') {
        startTime = performance.timing['navigationStart']
        // EPISODES.dprint("EPISODES.findStartWebTiming: startTime = " + startTime);
    }

    return startTime
}

// Find the start time based on a cookie set by Episodes in the unload handler.
EPISODES.findStartCookie = function () {
    var aCookies = document.cookie.split(' ')
    for (var i = 0; i < aCookies.length; i++) {
        if (aCookies[i].indexOf('EPISODES=') === 0) {
            var aSubCookies = aCookies[i].substring('EPISODES='.length).split('&')
            var startTime, bReferrerMatch
            for (var j = 0; j < aSubCookies.length; j++) {
                if (aSubCookies[j].indexOf('s=') === 0) {
                    startTime = aSubCookies[j].substring(2)
                } else if (aSubCookies[j].indexOf('r=') === 0) {
                    var startPage = aSubCookies[j].substring(2)
                    bReferrerMatch = (escape(document.referrer) == startPage)
                }
            }
            if (bReferrerMatch && startTime) {
                // EPISODES.dprint("EPISODES.findStartCookie: startTime = " + startTime);
                return startTime
            }
        }
    }

    return undefined
}

// Set a cookie when the page unloads. Consume this cookie on the next page to get a "start time".
// Does not work in some browsers (Opera).
EPISODES.beforeUnload = function (e) {
    document.cookie = 'EPISODES=s=' + Number(new Date()) + '&r=' + escape(document.location) + '; path=/'
}

// When the page is done do final wrap-up.
EPISODES.onload = function (e) {
    EPISODES.mark('onload')

    if (EPISODES.autorun) {
        EPISODES.done()
    }
}

// Gather aggregate stats for all the resources in EPISODES.hResourceTiming.
EPISODES.measureResources = function () {
    if (!('performance' in window) || !window.performance || !window.performance.getEntriesByType) {
        // Bail if Resource Timing is not supported.
        return
    }

    EPISODES.bAllDomains = true
    if (EPISODES.aDomains && EPISODES.aDomains.length > 0) {
        // If we have a list of domains, then only look at those resources.
        EPISODES.bAllDomains = false
        EPISODES.numDomains = EPISODES.aDomains.length

        // Handle wildcard domains: we convert the domain names to regex format.
        for (var i = 0; i < EPISODES.numDomains; i++) {
            var domain = EPISODES.aDomains[i]
            if (domain.indexOf('*.') === 0) {
                // If there's a wildcard we have to add a new domain for JUST the top- & second-level-domain values.
                EPISODES.aDomains.push('^' + domain.replace(/^\*\./, '') + '$')
            }
            EPISODES.aDomains[i] = '^' + domain.replace(/\./g, '\\.').replace(/^\*\\\./, '.*\\.') + '$' // backslash all "." and change "*." to "."
        }
        EPISODES.numDomains = EPISODES.aDomains.length // update the value since we might have added new ones
    }

    // Record timing metrics for each appropriate resource.
    var aDns = []; var aDnsNz = []; var aSsl = []; var aSslNz = []; var aTcp = []; var aTcpNz = []; var aTtfb = []; var aTtfbNz = []; var aContent = []; var aContentNz = []; var aDur = []; var aDurNz = []; var aDownload = []; var aDownloadNz = []
    var aEntries = performance.getEntriesByType('resource')
    for (var i = 0, len = aEntries.length, maxSlow = 0; i < len; i++) {
        var entry = aEntries[i]
        if (EPISODES.domainMatch(entry)) {
            var hTimes = EPISODES.getResourceTiming(entry)
            var t = hTimes.dur
            aDur.push(t) // we ALWAYS have a duration
            if (t) { aDurNz.push(t) }

            if (typeof (t = hTimes.download) !== 'undefined') {
                aDownload.push(t)
                if (t) { aDownloadNz.push(t) }
                if (t > maxSlow) {
                    maxSlow = t
                    EPISODES.slowestEntry = entry
                }
            }
            if (typeof (t = hTimes.dns) !== 'undefined') {
                aDns.push(t)
                if (t) { aDnsNz.push(t) }
            }
            if (typeof (t = hTimes.tcp) !== 'undefined') {
                aTcp.push(t)
                if (t > 0) { aTcpNz.push(t) }
            }
            if (typeof (t = hTimes.ttfb) !== 'undefined') {
                t = hTimes.ttfb
                aTtfb.push(t)
                if (t > 0) { aTtfbNz.push(t) }
            }
            if (typeof (t = hTimes.content) !== 'undefined') {
                t = hTimes.content
                aContent.push(t)
                if (t > 0) { aContentNz.push(t) }
            }
            if (typeof (t = hTimes.ssl) !== 'undefined') {
                aSsl.push(t)
                if (t > 0) { aSslNz.push(t) }
            }
        }
    }

    // compute aggregate stats
    EPISODES.hResourceTiming = {}
    EPISODES.aggStats(EPISODES.hResourceTiming, 'dns', aDns)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'dnsnz', aDnsNz)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'tcp', aTcp)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'tcpnz', aTcpNz)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'ssl', aSsl)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'sslnz', aSslNz)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'ttfb', aTtfb)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'ttfbnz', aTtfbNz)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'content', aContent)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'contentnz', aContentNz)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'dur', aDur)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'durnz', aDurNz)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'download', aDownload)
    EPISODES.aggStats(EPISODES.hResourceTiming, 'downloadnz', aDownloadNz)
}

// return a hash of calculated times
EPISODES.getResourceTiming = function (entry) {
    var hTimes = {}
    hTimes.dur = Math.round(entry.duration)

    // Make sure we have access to the cross-domain restricted properties.
    if (entry.requestStart != 0) {
        hTimes.dns = Math.round(entry.domainLookupEnd - entry.domainLookupStart)
        hTimes.tcp = Math.round(entry.connectEnd - entry.connectStart)
        hTimes.ttfb = Math.round(entry.responseStart - entry.requestStart)
        hTimes.content = Math.round(entry.responseEnd - entry.responseStart)
        hTimes.download = hTimes.dns + hTimes.tcp + hTimes.ttfb + hTimes.content
        if (entry.secureConnectionStart) {
            // secureConnectionStart can be "undefined" or "0"
            hTimes.ssl = Math.round(entry.connectEnd - entry.secureConnectionStart)
        }
    }

    return hTimes
}

// Return true if the resource entry's domain matches the domain we're supposed to measure.
EPISODES.domainMatch = function (entry) {
    if (EPISODES.bAllDomains) {
        return true
    }

    // Actually test the domain.
    if (!EPISODES.tmpA) {
        EPISODES.tmpA = document.createElement('a') // we re-use this anchor element to help parse URLs
    }

    tmpA.href = entry.name // do this for easier parsing
    var hostname = tmpA.hostname
    for (var j = 0; j < EPISODES.numDomains; j++) {
        if (hostname.match(EPISODES.aDomains[j])) {
            return true
        }
    }

    return false
}

EPISODES.aggStats = function (h, name, a) {
    h[name] = {}
    h[name]['num'] = a.length
    if (a.length) {
        a.sort(EPISODES.sortDesc)
        h[name]['max'] = EPISODES.arrayMax(a, true)
        h[name]['med'] = EPISODES.arrayMed(a, true)
        h[name]['avg'] = EPISODES.arrayAvg(a)
    }
}

// use this with the array sort() function to sort numbers
EPISODES.sortDesc = function (a, b) {
    return b - a
}

// return the max value from an array
// if bDesc == true then the array is presumed to be in descending order
EPISODES.arrayMax = function (a, bDesc) {
    return (bDesc ? a[0] : a.sort(EPISODES.sortDesc)[0])
}

// return the median value from an array
// if bDesc == true then the array is presumed to be in descending order
EPISODES.arrayMed = function (a, bDesc) {
    if (!bDesc) {
        a.sort(EPISODES.sortDesc)
    }

    var len = a.length
    if (len == 0) {
        return undefined
    }

    var middle = Math.floor(len / 2)
    if (2 * middle == len) {
        // even number of elements
        return Math.round((a[middle - 1] + a[middle]) / 2)
    } else {
        // odd number of elements
        return a[middle]
    }
}

// return the average of an array of numbers
EPISODES.arrayAvg = function (a) {
    var len = a.length
    var sum = 0
    for (var i = 0; i < len; i++) {
        sum += a[i]
    }

    return Math.round(sum / len)
}

// Wrapper for addEventListener and attachEvent.
EPISODES.addEventListener = function (sType, callback, bCapture) {
    if (typeof (window.attachEvent) !== 'undefined') {
        return window.attachEvent('on' + sType, callback)
    } else if (window.addEventListener) {
        return window.addEventListener(sType, callback, bCapture)
    }
}

// Wrapper for debug log function.
if (typeof (console) !== 'undefined' && typeof (console.log) !== 'undefined') {
    EPISODES.dprint = function (msg) { console.log(msg) }
} else {
    EPISODES.dprint = function (msg) { }
}

EPISODES.init()

/**
 * web页面加载时间上报
 * @Author   smy
 * @DateTime 2018-06-29T16:55:09+0800
 */
function reportWebLoadInfo () {
    if (typeof (EPISODES.measures.totalLoadTime) !== 'undefined') {
        gjReport.webloadReport(EPISODES.measures.totalLoadTime)
        console.log('Page load time: ' + EPISODES.measures.totalLoadTime + 'ms')
    } else {
        setTimeout(function () {
            reportWebLoadInfo()
        }, 200)
    }
}
reportWebLoadInfo()
