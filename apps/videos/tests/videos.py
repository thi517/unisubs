# -*- coding: utf-8 -*-
# Amara, universalsubtitles.org
#
# Copyright (C) 2012 Participatory Culture Foundation
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see
# http://www.gnu.org/licenses/agpl-3.0.html.

from datetime import datetime

import math_captcha
import babelsubs
from django.core.urlresolvers import reverse
from django.test import TestCase

from apps.auth.models import CustomUser as User
from apps.subtitles.pipeline import add_subtitles
from apps.videos.models import (
    Video, SubtitleLanguage, Subtitle, SubtitleVersion
)



math_captcha.forms.math_clean = lambda form: None

SRT = u"""1
00:00:00,004 --> 00:00:02,093
We\n started <b>Universal Subtitles</b> <i>because</i> we <u>believe</u>
"""

def create_langs_and_versions(video, langs, user=None):
    from subtitles import pipeline

    subtitles = (babelsubs.load_from(SRT, type='srt', language='en')
                          .to_internal())
    return [pipeline.add_subtitles(video, l, subtitles) for l in langs]


def _create_trans( video, latest_version=None, lang_code=None, forked=False):
        translation = SubtitleLanguage()
        translation.video = video
        translation.language = lang_code
        translation.is_original = False
        translation.is_forked = forked
        if not forked:
            translation.standard_language = video.subtitle_language()
        translation.save()
        v = SubtitleVersion()
        v.language = translation
        if latest_version:
            v.version_no = latest_version.version_no+1
        else:
            v.version_no = 1
        v.datetime_started = datetime.now()
        v.save()

        if latest_version is not None:
            for s in latest_version.subtitle_set.all():
                s.duplicate_for(v).save()
        return translation

def create_version(lang, subs=None, user=None):
    latest = lang.latest_version()
    version_no = latest and latest.version_no + 1 or 1
    version = SubtitleVersion(version_no=version_no,
                              user=user or User.objects.all()[0],
                              language=lang,
                              datetime_started=datetime.now())
    version.is_forked = lang.is_forked
    version.save()
    if subs is None:
        subs = []
        for x in xrange(0,5):
            subs.append({
                "subtitle_text": "hey %s" % x,
                "subtitle_id": "%s-%s-%s" % (version_no, lang.pk, x),
                "start_time": x,
                "end_time": (x* 1.0) - 0.1
            })
    for sub in subs:
        s = Subtitle(**sub)
        s.version  = version
        s.save()
    return version


def refresh_obj(m):
    return m.__class__._default_manager.get(pk=m.pk)


def quick_add_subs(language, subs_texts, escape=True):
    subtitles = babelsubs.storage.SubtitleSet(language_code=language.language_code)
    for i,text in enumerate(subs_texts):
        subtitles.append_subtitle(i*1000, i*1000 + 999, text, escape=escape)
    add_subtitles(language.video, language.language_code, subtitles)


class WebUseTest(TestCase):
    def _make_objects(self, video_id="S7HMxzLmS9gw"):
        self.auth = dict(username='admin', password='admin')
        self.user = User.objects.get(username=self.auth['username'])
        self.video = Video.objects.get(video_id=video_id)
        self.video.followers.add(self.user)

    def _simple_test(self, url_name, args=None, kwargs=None, status=200, data={}):
        response = self.client.get(reverse(url_name, args=args, kwargs=kwargs), data)
        self.assertEqual(response.status_code, status)
        return response

    def _login(self):
        self.client.login(**self.auth)


