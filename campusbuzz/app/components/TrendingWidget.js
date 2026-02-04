"use client";

import { useEffect, useState } from 'react';
import { ref, onValue, get } from 'firebase/database';
import { database } from '../lib/firebase';
import { TrendingUp, Calendar, Loader2, Users } from 'lucide-react';

export default function TrendingWidget() {
  const [trending, setTrending] = useState([]);
  const [events, setEvents] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);

  useEffect(() => {
    // Listen for trending topics from posts
    const postsRef = ref(database, 'posts');
    const unsubscribePosts = onValue(postsRef, (snapshot) => {
      if (snapshot.exists()) {
        const postsData = snapshot.val();
        const hashtagCount = {};

        // Extract hashtags from posts
        Object.values(postsData).forEach((post) => {
          const text = post.text || '';
          const hashtags = text.match(/#\w+/g) || [];
          hashtags.forEach((tag) => {
            hashtagCount[tag] = (hashtagCount[tag] || 0) + 1;
          });
        });

        // Convert to array and sort by count
        const trendingArray = Object.entries(hashtagCount)
          .map(([tag, count]) => ({
            tag,
            posts: `${count} post${count > 1 ? 's' : ''}`
          }))
          .sort((a, b) => parseInt(b.posts) - parseInt(a.posts))
          .slice(0, 5);

        setTrending(trendingArray);
      } else {
        setTrending([]);
      }
      setLoadingTrending(false);
    });

    // Listen for events
    const eventsRef = ref(database, 'events');
    const unsubscribeEvents = onValue(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const eventsData = snapshot.val();
        const eventsArray = Object.entries(eventsData).map(([id, data]) => ({
          id,
          ...data
        }));
        // Sort by date
        eventsArray.sort((a, b) => new Date(a.date) - new Date(b.date));
        setEvents(eventsArray);
      } else {
        setEvents([]);
      }
      setLoadingEvents(false);
    });

    // Get user suggestions (clubs, official accounts)
    const suggestionsRef = ref(database, 'suggestions');
    get(suggestionsRef).then((snapshot) => {
      if (snapshot.exists()) {
        const suggestionsData = snapshot.val();
        const suggestionsArray = Object.entries(suggestionsData).map(([id, data]) => ({
          id,
          ...data
        }));
        setSuggestions(suggestionsArray);
      } else {
        setSuggestions([]);
      }
      setLoadingSuggestions(false);
    });

    return () => {
      unsubscribePosts();
      unsubscribeEvents();
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Trending Topics */}
      <div className="bg-black border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-bold">Trending in Campus</h2>
        </div>

        {loadingTrending ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : trending.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No trending topics yet. Start using hashtags in your posts!</p>
        ) : (
          <div className="space-y-4">
            {trending.map((topic, index) => (
              <button
                key={index}
                className="w-full text-left hover:bg-gray-900 p-3 rounded-lg transition"
              >
                <p className="font-semibold text-blue-400 mb-1">{topic.tag}</p>
                <p className="text-sm text-gray-500">{topic.posts}</p>
              </button>
            ))}
          </div>
        )}

        {trending.length > 0 && (
          <button className="w-full mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium">
            Show more
          </button>
        )}
      </div>

      {/* College Events */}
      <div className="bg-black border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-bold">College Events</h2>
        </div>

        {loadingEvents ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No upcoming events. Check back later!</p>
        ) : (
          <div className="space-y-4">
            {events.slice(0, 3).map((event, index) => (
              <div
                key={index}
                className="hover:bg-gray-900 p-3 rounded-lg transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white">{event.name}</h3>
                  {event.registered && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                      Registered
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{event.date}</span>
                </div>
                <span className="inline-block mt-2 text-xs text-blue-400">
                  {event.category}
                </span>
              </div>
            ))}
          </div>
        )}

        {events.length > 0 && (
          <button className="w-full mt-4 text-blue-400 hover:text-blue-300 text-sm font-medium">
            View all events
          </button>
        )}
      </div>

      {/* Who to Follow */}
      <div className="bg-black border border-gray-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-500" />
          <h2 className="text-xl font-bold">Who to Follow</h2>
        </div>

        {loadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : suggestions.length === 0 ? (
          <p className="text-gray-500 text-sm py-4">No suggestions available yet.</p>
        ) : (
          <div className="space-y-4">
            {suggestions.slice(0, 3).map((account, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {account.image ? (
                    <img 
                      src={account.image} 
                      alt={account.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <span className="text-sm font-bold">
                        {account.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="font-semibold text-sm">{account.name}</p>
                      {account.verified && (
                        <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{account.handle}</p>
                  </div>
                </div>
                <button className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-full text-sm font-medium transition">
                  Follow
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Links */}
      <div className="text-xs text-gray-500 space-y-2 px-4">
        <div className="flex flex-wrap gap-3">
          <a href="#" className="hover:text-blue-400">Terms of Service</a>
          <a href="#" className="hover:text-blue-400">Privacy Policy</a>
          <a href="#" className="hover:text-blue-400">Cookie Policy</a>
        </div>
        <p>© 2024 CollegeBuzz. All rights reserved.</p>
      </div>
    </div>
  );
}