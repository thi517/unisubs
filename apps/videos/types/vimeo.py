# Amara, universalsubtitles.org
# 
# Copyright (C) 2013 Participatory Culture Foundation
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
# 
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see 
# http://www.gnu.org/licenses/agpl-3.0.html.

import requests, re
from externalsites import vimeo
from base import VideoType, VideoTypeError
from django.conf import settings
from django.utils.html import strip_tags

vimeo.VIMEO_API_KEY = getattr(settings, 'VIMEO_API_KEY')
vimeo.VIMEO_API_SECRET = getattr(settings, 'VIMEO_API_SECRET')
VIMEO_REGEX = re.compile(r'https?://([^/]+\.)?vimeo.com/(channels/[\w]+[#|/])?(?P<video_id>\d+)')

class VimeoVideoType(VideoType):

    abbreviation = 'V'
    name = 'Vimeo.com'   
    site = 'vimeo.com'
    
    def __init__(self, url):
        self.url = url
        self.videoid = self._get_vimeo_id(url)
        
    @property
    def video_id(self):
        return self.videoid
    
    def convert_to_video_url(self):
        return 'http://vimeo.com/%s' % self.videoid

    @classmethod
    def matches_video_url(cls, url):
        return bool(VIMEO_REGEX.match(url))

    def set_values(self, video_obj, user, team, video_url):
        if vimeo.VIMEO_API_KEY and vimeo.VIMEO_API_SECRET:
            try:
                values = vimeo.get_values(self.videoid)
                video_obj.thumbnail = values[3]
                video_obj.small_thumbnail = values[4]
                video_obj.duration = values[2]
                video_obj.title = values[0]
                video_obj.description = values[1]
            except Exception, e:
                # in case the Vimeo video is private.
                pass

    def _get_vimeo_id(self, video_url):
        return VIMEO_REGEX.match(video_url).groupdict().get('video_id')

    def player_url(self):
        return self.get_direct_url() or self.url

    def get_direct_url(self, prefer_audio=False):
        r = requests.get("https://player.vimeo.com/video/{}/config".format(self.video_id))
        if r.status_code == requests.codes.ok:
            try:
                config = r.json()
                if "request" in config and \
                   "files" in config["request"] and \
                   'progressive' in config["request"]["files"] and \
                   len(config["request"]["files"]['progressive']) > 0 and \
                   'url' in config["request"]["files"]['progressive'][0]:
                    return config["request"]["files"]['progressive'][0]['url']
                if "request" in config and \
                   "files" in config["request"] and \
                   'h264' in config["request"]["files"] and \
                   'mobile' in config["request"]["files"]["h264"] and \
                   'url' in config["request"]["files"]["h264"]["mobile"]:
                    return config[u"request"]["files"]["h264"]["mobile"]["url"]
            except:
                return None
        return None
