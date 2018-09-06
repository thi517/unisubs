# Copyright (c) 2008 Joost Cassee
# Licensed under the terms of the MIT License (see LICENSE.txt)

from django.conf import settings
from django.core.urlresolvers import get_script_prefix
from django import template
from django.template import (Node, TemplateSyntaxError, defaulttags)
from django.template.base import Token
from django.template.defaultfilters import stringfilter
from django.utils import translation
import localeurl.settings
from localeurl import utils

register = template.Library()


def chlocale(url, locale):
    """
    Changes the URL's locale prefix if the path is not locale-independent.
    Otherwise removes locale prefix.
    """
    script_prefix, path = strip_script_prefix(url)
    _, path = utils.strip_path(path)
    return utils.locale_url(path, locale)

chlocale = stringfilter(chlocale)
register.filter('chlocale', chlocale)


def rmlocale(url):
    """Removes the locale prefix from the URL."""
    script_prefix, path = strip_script_prefix(url)
    _, path = utils.strip_path(path)
    return ''.join([script_prefix, path])

rmlocale = stringfilter(rmlocale)
register.filter('rmlocale', rmlocale)


def strip_script_prefix(url):
    """
    Strips the SCRIPT_PREFIX from the URL. Because this function is meant for
    use in templates, it assumes the URL starts with the prefix.
    """
    assert url.startswith(get_script_prefix()), \
            "URL does not start with SCRIPT_PREFIX: %s" % url
    pos = len(get_script_prefix()) - 1
    return url[:pos], url[pos:]
