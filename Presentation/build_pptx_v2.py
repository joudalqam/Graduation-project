"""
Trip Planner — Graduation Presentation (Design v2)
A second, distinct visual style: editorial, photo-forward, emerald + coral palette.
Standard library only. Embeds existing project photos + optional UI screenshots.
"""

import os
import zipfile
from datetime import datetime
from xml.sax.saxutils import escape

# ---------- Theme v2 (editorial: emerald + coral + cream) ----------
DEEP    = "0F2A2E"   # deep emerald-charcoal
EMERALD = "0D7B6F"
CORAL   = "FF6F61"
CREAM   = "FAF6F0"
PAPER   = "FFFFFF"
INK     = "1F2937"
MUTED   = "6B7280"
LINE    = "E5E7EB"
SOFT    = "F3F1EC"

SLIDE_W = 12192000
SLIDE_H = 6858000

# ---------- Project photos (already in repo root) ----------
PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTO_HERO       = os.path.join(PROJECT_DIR, "photo-1714412192114-61dca8f15f68.jpg")
PHOTO_MAP        = os.path.join(PROJECT_DIR, "photo-1660207766758-a2e5985005ad.jpg")
PHOTO_AI         = os.path.join(PROJECT_DIR, "photo-1673505413397-0cd0dc4f5854.jpg")
PHOTO_FOOD       = os.path.join(PROJECT_DIR, "photo-1588001400947-6385aef4ab0e.jpg")

# Optional: drop UI screenshots into Presentation/screenshots/  (auto-detected)
SCREENSHOTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
SCREEN_LOGIN    = os.path.join(SCREENSHOTS_DIR, "login.png")
SCREEN_CUSTOM   = os.path.join(SCREENSHOTS_DIR, "customize.png")
SCREEN_RESULT   = os.path.join(SCREENSHOTS_DIR, "result.png")

# ---------- Slide content ----------
SLIDES = [
    {"type": "cover",
     "kicker": "GRADUATION PROJECT",
     "title": "Trip Planner",
     "subtitle": "An AI-Powered Smart Travel Planning System",
     "image": PHOTO_HERO},

    {"type": "section",
     "number": "01",
     "label": "THE CHALLENGE",
     "title": "Problem Statement"},

    {"type": "content_lead",
     "title": "Problem Statement",
     "lead": "Planning a trip is fragmented, slow, and rarely personal.",
     "points": [
         ("Tool overload",        "Travelers juggle maps, blogs, reviews, and booking sites separately."),
         ("Generic results",      "Recommendations ignore budget, group type, and personal taste."),
         ("Manual itineraries",   "Building a realistic day-by-day plan takes hours of work."),
         ("Hard trade-offs",      "Distance, timing, and cost are difficult to balance by hand."),
         ("No single platform",   "Planning, recommendations, and reservations live in different apps."),
     ]},

    {"type": "section",
     "number": "02",
     "label": "OUR ANSWER",
     "title": "Proposed Solution"},

    {"type": "content_lead",
     "title": "Proposed Solution",
     "lead": "An intelligent travel companion that builds a personalized trip in seconds.",
     "points": [
         ("Smart inputs",         "Destination, duration, budget, trip type, and traveler count."),
         ("AI-generated plan",    "A complete day-by-day itinerary tuned to the user's profile."),
         ("Authoritative data",   "Powered by Google Maps and Google Places APIs."),
         ("Interactive map",      "Markers, distances, and routes between every stop."),
         ("WhatsApp actions",     "Reservations and reminders inside the user's daily app."),
         ("Persistent history",   "Trips, preferences, and reservations stored securely."),
     ]},

    {"type": "objectives_grid",
     "title": "Project Objectives",
     "items": [
         ("Automate", "Generate complete itineraries from minimal user input."),
         ("Personalize", "Tailor every recommendation to the user's profile."),
         ("Integrate", "Connect Google Maps, Places, AI, and WhatsApp."),
         ("Simplify", "Deliver a clean, intuitive, responsive interface."),
         ("Persist", "Store trips, preferences, and history reliably."),
         ("Act", "Turn plans into real reservations through WhatsApp."),
     ]},

    {"type": "two_col_pairs",
     "title": "System Features",
     "left_title": "What the User Provides",
     "left_items": [
         "Destination",
         "Trip duration",
         "Budget — Low / Medium / High",
         "Trip type — Family, Adventure, Romantic, Cultural, Relaxation",
         "Number of travelers",
     ],
     "right_title": "What the System Delivers",
     "right_items": [
         "Personalized daily itinerary",
         "Recommended attractions, restaurants & cafes",
         "Interactive map with markers and distance",
         "Budget-aware alternative suggestions",
         "WhatsApp reservation & reminder messages",
         "Saved trip history per user",
     ]},

    {"type": "architecture",
     "title": "System Architecture",
     "lead": "A clean, layered architecture designed for clarity and scale.",
     "layers": [
         ("Presentation",  "Responsive web frontend",            "HTML5 · CSS3 · JavaScript"),
         ("Application",   "REST API server",                    "Node.js · Express.js"),
         ("Intelligence",  "AI engine + ranking algorithm",      "Recommendation logic"),
         ("Integration",   "External services",                  "Google Maps · Places · WhatsApp"),
         ("Data",          "Persistent storage",                 "MongoDB"),
     ]},

    {"type": "tech_grid",
     "title": "Technologies Used",
     "groups": [
         ("Frontend",        ["HTML5", "CSS3", "JavaScript", "Responsive UI"]),
         ("Backend",         ["Node.js", "Express.js", "REST API"]),
         ("Database",        ["MongoDB", "Mongoose ODM"]),
         ("APIs & Services", ["Google Maps API", "Google Places API", "WhatsApp API"]),
         ("Intelligence",   ["AI Recommendation Engine", "Ranking Algorithm"]),
         ("Tooling",         ["Git & GitHub", "VS Code", "Postman"]),
     ]},

    {"type": "image_split",
     "title": "Google Maps & Places",
     "lead": "Real-world location intelligence behind every recommendation.",
     "bullets": [
         "Google Places supplies attractions, restaurants, cafes, ratings.",
         "Google Maps renders an interactive map with custom markers.",
         "Distance Matrix calculates travel time between every two stops.",
         "Photos, opening hours, and reviews enrich each place.",
         "Geocoding turns destinations into precise coordinates.",
     ],
     "image": PHOTO_MAP},

    {"type": "content_lead",
     "title": "Place Ranking Algorithm",
     "lead": "A weighted scoring model that orders places by real-user fit.",
     "points": [
         ("Inputs",       "Budget level, trip type, traveler count, and place metadata."),
         ("Scoring",      "Each place is scored on relevance, rating, distance, price."),
         ("Adaptation",   "Weights shift dynamically with the chosen trip type."),
         ("Selection",    "Top-ranked places fill the itinerary by proximity."),
         ("Alternatives", "Lower-ranked items become budget-aware suggestions."),
     ]},

    {"type": "image_split",
     "title": "AI Recommendation Engine",
     "lead": "An intelligent layer that personalizes every itinerary.",
     "bullets": [
         "Learns from user preferences, trip type, and prior trips.",
         "Generates context-aware suggestions for places, food, activities.",
         "Balances variety, distance, and budget across each day.",
         "Produces natural-language descriptions for every stop.",
         "Refines results continuously as more user data is collected.",
     ],
     "image": PHOTO_AI,
     "image_left": False},

    {"type": "content_lead",
     "title": "WhatsApp Integration",
     "lead": "Bringing the trip into the user's most-used messaging app.",
     "points": [
         ("Reserve",   "Send reservation requests to restaurants and venues."),
         ("Remind",    "Receive automated reminders before each scheduled activity."),
         ("Share",     "Send the full itinerary to family or travel companions instantly."),
         ("Confirm",   "Track bookings and updates in a familiar chat flow."),
         ("Convert",   "Reduce friction between planning and real action."),
     ]},

    {"type": "two_col_pairs",
     "title": "Database Structure — MongoDB",
     "left_title": "Core Collections",
     "left_items": [
         "Users — profile, credentials, contact",
         "Preferences — trip type, budget, interests",
         "Trips — destination, duration, travelers",
         "Itineraries — day-by-day plan with places",
         "Places — cached Google Places data",
         "Reservations — WhatsApp request records",
     ],
     "right_title": "Key Relationships",
     "right_items": [
         "One user → many trips",
         "Each trip → one itinerary",
         "Each itinerary → many places per day",
         "Preferences feed the AI ranking engine",
         "Reservations link users to specific places",
         "History fuels smarter future recommendations",
     ]},

    {"type": "flow",
     "title": "Sample User Flow",
     "lead": "From sign-in to a fully reserved trip in under a minute.",
     "steps": [
         "Sign In",
         "Enter Trip Details",
         "AI Generates Itinerary",
         "Review on Interactive Map",
         "Reserve via WhatsApp",
         "Save & Share Trip",
     ]},

    {"type": "itinerary",
     "title": "Example Generated Itinerary",
     "subtitle": "Destination · Istanbul   |   Duration · 3 Days   |   Budget · Medium   |   Type · Cultural",
     "image": PHOTO_FOOD,
     "days": [
         ("Day 1 — Historic Heart",
          ["Hagia Sophia", "Blue Mosque", "Lunch · Sultanahmet Köftecisi", "Topkapi Palace", "Sunset · Galata Bridge"]),
         ("Day 2 — Bazaars & Bosphorus",
          ["Grand Bazaar", "Spice Bazaar", "Bosphorus Cruise", "Dinner in Karaköy", "Rooftop café coffee"]),
         ("Day 3 — Modern Istanbul",
          ["Dolmabahçe Palace", "İstiklal Street walk", "Lunch in Taksim", "Galata Tower view", "Farewell seaside dinner"]),
     ]},

    {"type": "content_lead",
     "title": "Future Scalability",
     "lead": "A foundation ready to grow with users and ambition.",
     "points": [
         ("Reach",       "Multi-language support for international travelers."),
         ("Mobile",      "Native iOS and Android applications."),
         ("Bookings",    "Direct integrations with hotels and flights."),
         ("Collab",      "Group trip planning with shared itineraries."),
         ("Smarter AI",  "Personalization driven by larger user datasets."),
         ("Cloud",       "Scalable deployment with caching and load balancing."),
     ]},

    {"type": "thanks",
     "title": "Thank You",
     "subtitle": "Trip Planner — Smarter trips, effortlessly planned.",
     "footer": "Questions & Discussion",
     "image": PHOTO_HERO},
]

# Try to slot in screenshot slides if files are present
def _maybe_screenshot_slides():
    extras = []
    if os.path.exists(SCREEN_LOGIN):
        extras.append({"type": "screenshot",
                       "title": "Inside the Product — Sign In",
                       "caption": "Welcome back screen with email + password and Google sign-in.",
                       "image": SCREEN_LOGIN})
    if os.path.exists(SCREEN_CUSTOM):
        extras.append({"type": "screenshot",
                       "title": "Inside the Product — Customize Each Day",
                       "caption": "User picks the vibe per day: Adventure, Food, or Relaxing.",
                       "image": SCREEN_CUSTOM})
    if os.path.exists(SCREEN_RESULT):
        extras.append({"type": "screenshot",
                       "title": "Inside the Product — Generated Itinerary",
                       "caption": "Day-by-day plan with map, distances, and WhatsApp action.",
                       "image": SCREEN_RESULT})
    return extras

# Insert screenshots right before the "Future Scalability" slide
def _assemble_slides():
    extras = _maybe_screenshot_slides()
    if not extras:
        return SLIDES
    # find index of Future Scalability
    out = []
    inserted = False
    for s in SLIDES:
        if not inserted and s.get("title") == "Future Scalability":
            out.extend(extras)
            inserted = True
        out.append(s)
    return out

# ---------- XML helpers ----------
NSMAP = (
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
)

def emu(inches):
    return int(inches * 914400)

def text_run(text, size_pt, bold=False, color=INK, font="Calibri", italic=False):
    b = ' b="1"' if bold else ""
    i = ' i="1"' if italic else ""
    return (
        f'<a:r><a:rPr lang="en-US" sz="{int(size_pt*100)}"{b}{i} dirty="0">'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
        f'<a:latin typeface="{font}"/></a:rPr>'
        f'<a:t>{escape(text)}</a:t></a:r>'
    )

def paragraph(text, size_pt=18, bold=False, color=INK, bullet=False, align="l", font="Calibri",
              spacing_before=0, italic=False, line_spacing=None):
    bu = ""
    indent = ""
    if bullet:
        bu = '<a:buFont typeface="Arial"/><a:buChar char="&#8226;"/>'
        indent = ' indent="-228600" marL="228600"'
    spc = f'<a:spcBef><a:spcPts val="{spacing_before}"/></a:spcBef>' if spacing_before else ""
    ls = f'<a:lnSpc><a:spcPct val="{line_spacing}"/></a:lnSpc>' if line_spacing else ""
    return (
        f'<a:p><a:pPr algn="{align}"{indent}>{ls}{spc}{bu}</a:pPr>'
        f'{text_run(text, size_pt, bold=bold, color=color, font=font, italic=italic)}'
        f'</a:p>'
    )

def empty_paragraph():
    return '<a:p><a:endParaRPr lang="en-US"/></a:p>'

def shape_rect(sp_id, name, x, y, cx, cy, fill_color, body_xml="", line_color=None, prst="rect", line_w=12700):
    line = ""
    if line_color:
        line = f'<a:ln w="{line_w}"><a:solidFill><a:srgbClr val="{line_color}"/></a:solidFill></a:ln>'
    fill = f'<a:solidFill><a:srgbClr val="{fill_color}"/></a:solidFill>' if fill_color else '<a:noFill/>'
    return (
        f'<p:sp><p:nvSpPr><p:cNvPr id="{sp_id}" name="{name}"/>'
        f'<p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
        f'<a:prstGeom prst="{prst}"><a:avLst/></a:prstGeom>'
        f'{fill}{line}</p:spPr>'
        f'<p:txBody><a:bodyPr wrap="square" anchor="ctr" lIns="91440" tIns="45720" rIns="91440" bIns="45720"/>'
        f'<a:lstStyle/>{body_xml if body_xml else empty_paragraph()}</p:txBody></p:sp>'
    )

def textbox(sp_id, name, x, y, cx, cy, body_xml, anchor="t"):
    return (
        f'<p:sp><p:nvSpPr><p:cNvPr id="{sp_id}" name="{name}"/>'
        f'<p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr>'
        f'<p:txBody><a:bodyPr wrap="square" anchor="{anchor}" lIns="91440" tIns="45720" rIns="91440" bIns="45720"/>'
        f'<a:lstStyle/>{body_xml}</p:txBody></p:sp>'
    )

def picture(sp_id, name, rid, x, y, cx, cy):
    return (
        f'<p:pic><p:nvPicPr><p:cNvPr id="{sp_id}" name="{name}"/>'
        f'<p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>'
        f'<p:nvPr/></p:nvPicPr>'
        f'<p:blipFill><a:blip r:embed="{rid}"/>'
        f'<a:srcRect/><a:stretch><a:fillRect/></a:stretch></p:blipFill>'
        f'<p:spPr><a:xfrm><a:off x="{x}" y="{y}"/><a:ext cx="{cx}" cy="{cy}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>'
    )

def slide_xml(shapes_xml, bg_color=PAPER):
    return (
        f'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        f'<p:sld {NSMAP}>'
        f'<p:cSld>'
        f'<p:bg><p:bgPr><a:solidFill><a:srgbClr val="{bg_color}"/></a:solidFill>'
        f'<a:effectLst/></p:bgPr></p:bg>'
        f'<p:spTree>'
        f'<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
        f'<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/>'
        f'<a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
        f'{shapes_xml}'
        f'</p:spTree></p:cSld>'
        f'<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>'
        f'</p:sld>'
    )

# ---------- Slide chrome (header + page number) ----------
def chrome(start_id, title, page_num, total):
    """Editorial chrome: thin top hairline, kicker + title, slide number top-right."""
    s = []
    # Top hairline
    s.append(shape_rect(start_id, "TopHair", 0, 0, SLIDE_W, emu(0.04), EMERALD))
    # Kicker (small upper label)
    kick = paragraph(f"TRIP PLANNER · GRADUATION PROJECT", size_pt=9, bold=True, color=MUTED, align="l")
    s.append(textbox(start_id+1, "Kicker", emu(0.6), emu(0.25), emu(8), emu(0.3), kick))
    # Title (large, left)
    t = paragraph(title, size_pt=32, bold=True, color=DEEP, align="l")
    s.append(textbox(start_id+2, "Title", emu(0.6), emu(0.55), SLIDE_W - emu(2.5), emu(1.0), t))
    # Underline
    s.append(shape_rect(start_id+3, "Underline", emu(0.6), emu(1.4), emu(0.6), emu(0.05), CORAL))
    # Slide number (right)
    pn = paragraph(f"{page_num:02d}", size_pt=44, bold=True, color=SOFT, align="r")
    s.append(textbox(start_id+4, "PageBig", SLIDE_W - emu(1.6), emu(0.25), emu(1.2), emu(1.0), pn))
    pn2 = paragraph(f"of {total:02d}", size_pt=10, bold=True, color=MUTED, align="r")
    s.append(textbox(start_id+5, "PageSmall", SLIDE_W - emu(1.6), emu(1.05), emu(1.2), emu(0.3), pn2))
    # Footer hairline + label
    s.append(shape_rect(start_id+6, "FootHair", emu(0.6), SLIDE_H - emu(0.45), SLIDE_W - emu(1.2), emu(0.01), LINE))
    foot = paragraph("trip planner  ·  ai-powered itineraries", size_pt=9, color=MUTED, align="l")
    s.append(textbox(start_id+7, "FootL", emu(0.6), SLIDE_H - emu(0.4), emu(8), emu(0.3), foot))
    foot_r = paragraph("graduation project · 2026", size_pt=9, color=MUTED, align="r")
    s.append(textbox(start_id+8, "FootR", SLIDE_W - emu(5), SLIDE_H - emu(0.4), emu(4.4), emu(0.3), foot_r))
    return "".join(s), start_id + 9

# ---------- Slide builders ----------
def build_cover(slide, media_rid):
    s = []
    # Full background cream
    s.append(shape_rect(2, "BG", 0, 0, SLIDE_W, SLIDE_H, CREAM))
    # Right-half hero photo
    s.append(picture(3, "Hero", media_rid, SLIDE_W // 2 + emu(0.2), 0, SLIDE_W // 2 - emu(0.2), SLIDE_H))
    # Left text block
    kicker = paragraph(slide["kicker"], size_pt=12, bold=True, color=CORAL, align="l")
    s.append(textbox(4, "Kicker", emu(0.9), emu(2.0), emu(6), emu(0.4), kicker))
    title = paragraph(slide["title"], size_pt=80, bold=True, color=DEEP, align="l")
    s.append(textbox(5, "Title", emu(0.9), emu(2.4), emu(6), emu(1.7), title))
    # Coral accent bar under title
    s.append(shape_rect(6, "Bar", emu(0.9), emu(4.2), emu(1.0), emu(0.08), CORAL))
    sub = paragraph(slide["subtitle"], size_pt=22, color=INK, align="l", line_spacing=120000)
    s.append(textbox(7, "Sub", emu(0.9), emu(4.45), emu(5.5), emu(1.2), sub))
    # Bottom meta
    meta = paragraph("PRESENTED · 2026", size_pt=10, bold=True, color=MUTED, align="l")
    s.append(textbox(8, "Meta", emu(0.9), SLIDE_H - emu(0.9), emu(5), emu(0.3), meta))
    # Decorative emerald strip on far left
    s.append(shape_rect(9, "Strip", 0, 0, emu(0.18), SLIDE_H, EMERALD))
    return slide_xml("".join(s), bg_color=CREAM)

def build_section(slide, page_num, total):
    s = []
    s.append(shape_rect(2, "BG", 0, 0, SLIDE_W, SLIDE_H, DEEP))
    # Big number
    num = paragraph(slide["number"], size_pt=240, bold=True, color="143034", align="l")
    s.append(textbox(3, "Num", emu(0.6), emu(0.6), emu(6), emu(5), num))
    # Label
    lab = paragraph(slide["label"], size_pt=14, bold=True, color=CORAL, align="l")
    s.append(textbox(4, "Lab", emu(0.9), emu(3.0), emu(8), emu(0.4), lab))
    # Title
    title = paragraph(slide["title"], size_pt=64, bold=True, color=PAPER, align="l")
    s.append(textbox(5, "Title", emu(0.9), emu(3.4), emu(11), emu(1.5), title))
    # Coral underline
    s.append(shape_rect(6, "Bar", emu(0.9), emu(4.7), emu(1.5), emu(0.08), CORAL))
    # Page number
    pn = paragraph(f"{page_num:02d} / {total:02d}", size_pt=11, bold=True, color="6FA39C", align="r")
    s.append(textbox(7, "PN", SLIDE_W - emu(2), SLIDE_H - emu(0.7), emu(1.5), emu(0.3), pn))
    return slide_xml("".join(s), bg_color=DEEP)

def build_content_lead(slide, page_num, total):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    # Lead paragraph
    lead = paragraph(slide["lead"], size_pt=18, italic=True, color=EMERALD, align="l", line_spacing=120000)
    s.append(textbox(nid, "Lead", emu(0.6), emu(1.7), SLIDE_W - emu(1.2), emu(0.8), lead))
    nid += 1
    # Two-column point list
    points = slide["points"]
    n = len(points)
    cols = 2
    rows = (n + cols - 1) // cols
    margin_x = emu(0.6)
    avail_w = SLIDE_W - margin_x * 2
    gap = emu(0.3)
    col_w = (avail_w - gap * (cols - 1)) // cols
    top_y = emu(2.7)
    avail_h = SLIDE_H - top_y - emu(0.7)
    row_h = (avail_h - gap * (rows - 1)) // rows

    for idx, (lbl, body) in enumerate(points):
        c = idx % cols
        r = idx // cols
        x = margin_x + c * (col_w + gap)
        y = top_y + r * (row_h + gap)
        # Card
        s.append(shape_rect(nid, f"Card{idx}", x, y, col_w, row_h, SOFT))
        nid += 1
        # Numbered bullet
        s.append(shape_rect(nid, f"Dot{idx}", x + emu(0.25), y + emu(0.3), emu(0.35), emu(0.35), CORAL, prst="ellipse"))
        nid += 1
        num_body = paragraph(f"{idx+1:02d}", size_pt=10, bold=True, color=PAPER, align="ctr")
        s.append(textbox(nid, f"DotN{idx}", x + emu(0.25), y + emu(0.36), emu(0.35), emu(0.3), num_body, anchor="ctr"))
        nid += 1
        # Label
        lab = paragraph(lbl, size_pt=14, bold=True, color=DEEP, align="l")
        s.append(textbox(nid, f"Lab{idx}", x + emu(0.75), y + emu(0.25), col_w - emu(1.0), emu(0.45), lab))
        nid += 1
        # Body
        bd = paragraph(body, size_pt=12, color=INK, align="l", line_spacing=120000)
        s.append(textbox(nid, f"Bd{idx}", x + emu(0.75), y + emu(0.7), col_w - emu(1.0), row_h - emu(0.85), bd))
        nid += 1
    return slide_xml("".join(s))

def build_objectives_grid(slide, page_num, total):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    items = slide["items"]
    cols = 3
    rows = 2
    margin_x = emu(0.6)
    top_y = emu(1.9)
    gap = emu(0.3)
    avail_w = SLIDE_W - margin_x * 2
    avail_h = SLIDE_H - top_y - emu(0.7)
    card_w = (avail_w - gap * (cols - 1)) // cols
    card_h = (avail_h - gap * (rows - 1)) // rows

    accents = [EMERALD, CORAL, EMERALD, CORAL, EMERALD, CORAL]
    for idx, (lbl, desc) in enumerate(items):
        r = idx // cols
        c = idx % cols
        x = margin_x + c * (card_w + gap)
        y = top_y + r * (card_h + gap)
        s.append(shape_rect(nid, f"OB{idx}", x, y, card_w, card_h, PAPER, line_color=LINE, line_w=9525))
        nid += 1
        # Side accent bar
        s.append(shape_rect(nid, f"OBBar{idx}", x, y, emu(0.1), card_h, accents[idx % len(accents)]))
        nid += 1
        # Number small
        small = paragraph(f"OBJECTIVE {idx+1:02d}", size_pt=9, bold=True, color=MUTED, align="l")
        s.append(textbox(nid, f"OBNum{idx}", x + emu(0.4), y + emu(0.3), card_w - emu(0.5), emu(0.3), small))
        nid += 1
        # Label
        lab = paragraph(lbl, size_pt=24, bold=True, color=DEEP, align="l")
        s.append(textbox(nid, f"OBLab{idx}", x + emu(0.4), y + emu(0.65), card_w - emu(0.5), emu(0.6), lab))
        nid += 1
        # Description
        bd = paragraph(desc, size_pt=12, color=INK, align="l", line_spacing=120000)
        s.append(textbox(nid, f"OBBd{idx}", x + emu(0.4), y + emu(1.4), card_w - emu(0.7), card_h - emu(1.5), bd))
        nid += 1
    return slide_xml("".join(s))

def build_two_col_pairs(slide, page_num, total):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    col_y = emu(1.85)
    col_h = SLIDE_H - col_y - emu(0.7)
    margin_x = emu(0.6)
    gap = emu(0.4)
    col_w = (SLIDE_W - margin_x * 2 - gap) // 2

    # Left column (emerald header)
    s.append(shape_rect(nid, "LP", margin_x, col_y, col_w, col_h, PAPER, line_color=LINE, line_w=9525))
    nid += 1
    s.append(shape_rect(nid, "LH", margin_x, col_y, col_w, emu(0.7), EMERALD))
    nid += 1
    lh = paragraph(slide["left_title"].upper(), size_pt=14, bold=True, color=PAPER, align="l")
    s.append(textbox(nid, "LHT", margin_x + emu(0.35), col_y + emu(0.18), col_w - emu(0.5), emu(0.45), lh))
    nid += 1
    li_body = "".join(
        paragraph(f"·  {it}", size_pt=14, color=INK, align="l", spacing_before=600, line_spacing=130000)
        for it in slide["left_items"]
    )
    s.append(textbox(nid, "LI", margin_x + emu(0.4), col_y + emu(1.0), col_w - emu(0.6), col_h - emu(1.2), li_body))
    nid += 1

    # Right column (coral header)
    rx = margin_x + col_w + gap
    s.append(shape_rect(nid, "RP", rx, col_y, col_w, col_h, PAPER, line_color=LINE, line_w=9525))
    nid += 1
    s.append(shape_rect(nid, "RH", rx, col_y, col_w, emu(0.7), CORAL))
    nid += 1
    rh = paragraph(slide["right_title"].upper(), size_pt=14, bold=True, color=PAPER, align="l")
    s.append(textbox(nid, "RHT", rx + emu(0.35), col_y + emu(0.18), col_w - emu(0.5), emu(0.45), rh))
    nid += 1
    ri_body = "".join(
        paragraph(f"·  {it}", size_pt=14, color=INK, align="l", spacing_before=600, line_spacing=130000)
        for it in slide["right_items"]
    )
    s.append(textbox(nid, "RI", rx + emu(0.4), col_y + emu(1.0), col_w - emu(0.6), col_h - emu(1.2), ri_body))
    nid += 1
    return slide_xml("".join(s))

def build_architecture(slide, page_num, total):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    lead = paragraph(slide["lead"], size_pt=16, italic=True, color=EMERALD, align="l")
    s.append(textbox(nid, "Lead", emu(0.6), emu(1.65), SLIDE_W - emu(1.2), emu(0.5), lead))
    nid += 1
    layers = slide["layers"]
    n = len(layers)
    margin_x = emu(0.6)
    top_y = emu(2.3)
    avail_h = SLIDE_H - top_y - emu(0.7)
    gap = emu(0.18)
    row_h = (avail_h - gap * (n - 1)) // n
    avail_w = SLIDE_W - margin_x * 2

    for idx, (name, desc, tech) in enumerate(layers):
        y = top_y + idx * (row_h + gap)
        s.append(shape_rect(nid, f"Lay{idx}", margin_x, y, avail_w, row_h, SOFT))
        nid += 1
        # Left strip (emerald)
        s.append(shape_rect(nid, f"LayBar{idx}", margin_x, y, emu(0.18), row_h, EMERALD))
        nid += 1
        # Layer name
        nm = paragraph(name.upper(), size_pt=15, bold=True, color=DEEP, align="l")
        s.append(textbox(nid, f"LayN{idx}", margin_x + emu(0.5), y + emu(0.05), emu(2.6), row_h, nm, anchor="ctr"))
        nid += 1
        # Description
        ds = paragraph(desc, size_pt=13, color=INK, align="l")
        s.append(textbox(nid, f"LayD{idx}", margin_x + emu(3.3), y + emu(0.05), emu(4.0), row_h, ds, anchor="ctr"))
        nid += 1
        # Tech
        tc = paragraph(tech, size_pt=12, bold=True, color=CORAL, align="l")
        s.append(textbox(nid, f"LayT{idx}", margin_x + emu(7.5), y + emu(0.05), emu(4.5), row_h, tc, anchor="ctr"))
        nid += 1
    return slide_xml("".join(s))

def build_tech_grid(slide, page_num, total):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    cols = 3
    rows = 2
    margin_x = emu(0.6)
    top_y = emu(1.85)
    gap = emu(0.25)
    avail_w = SLIDE_W - margin_x * 2
    avail_h = SLIDE_H - top_y - emu(0.7)
    card_w = (avail_w - gap * (cols - 1)) // cols
    card_h = (avail_h - gap * (rows - 1)) // rows

    accents = [EMERALD, CORAL, DEEP, CORAL, EMERALD, DEEP]
    for idx, (group, items) in enumerate(slide["groups"]):
        r = idx // cols
        c = idx % cols
        x = margin_x + c * (card_w + gap)
        y = top_y + r * (card_h + gap)
        s.append(shape_rect(nid, f"TC{idx}", x, y, card_w, card_h, PAPER, line_color=LINE, line_w=9525))
        nid += 1
        # Number badge
        s.append(shape_rect(nid, f"TCB{idx}", x + emu(0.3), y + emu(0.3), emu(0.45), emu(0.45), accents[idx % len(accents)], prst="ellipse"))
        nid += 1
        nb = paragraph(f"{idx+1:02d}", size_pt=11, bold=True, color=PAPER, align="ctr")
        s.append(textbox(nid, f"TCN{idx}", x + emu(0.3), y + emu(0.36), emu(0.45), emu(0.4), nb, anchor="ctr"))
        nid += 1
        gh = paragraph(group, size_pt=18, bold=True, color=DEEP, align="l")
        s.append(textbox(nid, f"TCG{idx}", x + emu(0.95), y + emu(0.3), card_w - emu(1.1), emu(0.5), gh))
        nid += 1
        items_body = "".join(
            paragraph(f"·  {it}", size_pt=12, color=INK, align="l", spacing_before=400, line_spacing=130000)
            for it in items
        )
        s.append(textbox(nid, f"TCI{idx}", x + emu(0.4), y + emu(1.0), card_w - emu(0.6), card_h - emu(1.1), items_body))
        nid += 1
    return slide_xml("".join(s))

def build_image_split(slide, page_num, total, media_rid):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    image_left = slide.get("image_left", True)
    img_w = emu(5.2)
    img_h = emu(4.4)
    img_y = emu(1.95)
    margin_x = emu(0.6)
    if image_left:
        img_x = margin_x
        text_x = margin_x + img_w + emu(0.5)
        text_w = SLIDE_W - margin_x * 2 - img_w - emu(0.5)
    else:
        img_x = SLIDE_W - margin_x - img_w
        text_x = margin_x
        text_w = SLIDE_W - margin_x * 2 - img_w - emu(0.5)
    # Photo with thin border
    s.append(shape_rect(nid, "PhotoBG", img_x - emu(0.08), img_y - emu(0.08), img_w + emu(0.16), img_h + emu(0.16), EMERALD))
    nid += 1
    s.append(picture(nid, "Photo", media_rid, img_x, img_y, img_w, img_h))
    nid += 1
    # Lead
    lead = paragraph(slide["lead"], size_pt=16, italic=True, color=EMERALD, align="l", line_spacing=120000)
    s.append(textbox(nid, "Lead", text_x, img_y, text_w, emu(0.9), lead))
    nid += 1
    # Bullets
    body = "".join(
        paragraph(b, size_pt=14, color=INK, align="l", bullet=True, spacing_before=600, line_spacing=130000)
        for b in slide["bullets"]
    )
    s.append(textbox(nid, "Body", text_x, img_y + emu(1.0), text_w, img_h - emu(1.0), body))
    nid += 1
    return slide_xml("".join(s))

def build_flow(slide, page_num, total):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    lead = paragraph(slide["lead"], size_pt=16, italic=True, color=EMERALD, align="l")
    s.append(textbox(nid, "Lead", emu(0.6), emu(1.65), SLIDE_W - emu(1.2), emu(0.5), lead))
    nid += 1

    steps = slide["steps"]
    n = len(steps)
    per_row = 3
    rows = (n + per_row - 1) // per_row
    margin_x = emu(0.6)
    avail_w = SLIDE_W - margin_x * 2
    arrow_w = emu(0.4)
    gap = emu(0.35)
    box_h = emu(1.4)
    row_gap = emu(0.5)
    total_h = rows * box_h + (rows - 1) * row_gap
    start_y = emu(2.4) + max(0, ((SLIDE_H - emu(2.4) - emu(0.7) - total_h) // 2))

    for r in range(rows):
        row_steps = steps[r * per_row:(r + 1) * per_row]
        m = len(row_steps)
        box_w = (avail_w - gap * (m - 1) - arrow_w * (m - 1)) // m
        y = start_y + r * (box_h + row_gap)
        for i, step in enumerate(row_steps):
            x = margin_x + i * (box_w + gap + arrow_w)
            color = EMERALD if (r * per_row + i) % 2 == 0 else CORAL
            # Card
            s.append(shape_rect(nid, f"FB{r}{i}", x, y, box_w, box_h, PAPER, line_color=color, line_w=19050))
            nid += 1
            # Top number bar
            s.append(shape_rect(nid, f"FBT{r}{i}", x, y, box_w, emu(0.35), color))
            nid += 1
            num = paragraph(f"STEP {r * per_row + i + 1:02d}", size_pt=10, bold=True, color=PAPER, align="l")
            s.append(textbox(nid, f"FBN{r}{i}", x + emu(0.25), y + emu(0.06), box_w - emu(0.5), emu(0.3), num))
            nid += 1
            # Label
            label = paragraph(step, size_pt=18, bold=True, color=DEEP, align="ctr")
            s.append(textbox(nid, f"FBL{r}{i}", x, y + emu(0.55), box_w, box_h - emu(0.6), label, anchor="ctr"))
            nid += 1
            # Arrow
            if i < m - 1:
                ax = x + box_w + emu(0.05)
                ay = y + box_h // 2 - emu(0.13)
                s.append(shape_rect(nid, f"FA{r}{i}", ax, ay, arrow_w - emu(0.1), emu(0.26), MUTED, prst="rightArrow"))
                nid += 1
    return slide_xml("".join(s))

def build_itinerary(slide, page_num, total, media_rid):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    sub = paragraph(slide["subtitle"], size_pt=12, bold=True, color=CORAL, align="l")
    s.append(textbox(nid, "Sub", emu(0.6), emu(1.65), SLIDE_W - emu(1.2), emu(0.4), sub))
    nid += 1

    # Banner image (small strip) — emerald frame
    s.append(shape_rect(nid, "BannerBG", emu(0.6) - emu(0.05), emu(2.05) - emu(0.05), SLIDE_W - emu(1.2) + emu(0.1), emu(0.9) + emu(0.1), EMERALD))
    nid += 1
    s.append(picture(nid, "Banner", media_rid, emu(0.6), emu(2.05), SLIDE_W - emu(1.2), emu(0.9)))
    nid += 1

    # Three day cards
    days = slide["days"]
    n = len(days)
    margin_x = emu(0.6)
    gap = emu(0.3)
    avail_w = SLIDE_W - margin_x * 2
    card_w = (avail_w - gap * (n - 1)) // n
    card_y = emu(3.15)
    card_h = SLIDE_H - card_y - emu(0.7)
    accents = [EMERALD, CORAL, DEEP]
    for i, (day_title, items) in enumerate(days):
        x = margin_x + i * (card_w + gap)
        s.append(shape_rect(nid, f"DC{i}", x, card_y, card_w, card_h, PAPER, line_color=LINE, line_w=9525))
        nid += 1
        s.append(shape_rect(nid, f"DH{i}", x, card_y, card_w, emu(0.7), accents[i % len(accents)]))
        nid += 1
        dt = paragraph(day_title, size_pt=14, bold=True, color=PAPER, align="l")
        s.append(textbox(nid, f"DT{i}", x + emu(0.25), card_y + emu(0.18), card_w - emu(0.5), emu(0.45), dt))
        nid += 1
        items_body = "".join(
            paragraph(f"·  {it}", size_pt=12, color=INK, align="l", spacing_before=500, line_spacing=130000)
            for it in items
        )
        s.append(textbox(nid, f"DI{i}", x + emu(0.3), card_y + emu(1.0), card_w - emu(0.6), card_h - emu(1.1), items_body))
        nid += 1
    return slide_xml("".join(s))

def build_screenshot(slide, page_num, total, media_rid):
    s_str, nid = chrome(2, slide["title"], page_num, total)
    s = [s_str]
    # Caption
    cap = paragraph(slide["caption"], size_pt=14, italic=True, color=EMERALD, align="l")
    s.append(textbox(nid, "Cap", emu(0.6), emu(1.65), SLIDE_W - emu(1.2), emu(0.4), cap))
    nid += 1
    # Big screenshot framed
    img_x = emu(1.0)
    img_y = emu(2.2)
    img_w = SLIDE_W - emu(2.0)
    img_h = SLIDE_H - img_y - emu(0.8)
    s.append(shape_rect(nid, "ShotBG", img_x - emu(0.08), img_y - emu(0.08), img_w + emu(0.16), img_h + emu(0.16), EMERALD))
    nid += 1
    s.append(picture(nid, "Shot", media_rid, img_x, img_y, img_w, img_h))
    nid += 1
    return slide_xml("".join(s))

def build_thanks(slide, media_rid):
    s = []
    # Full-bleed photo
    s.append(picture(2, "Bleed", media_rid, 0, 0, SLIDE_W, SLIDE_H))
    # Dark scrim
    s.append(shape_rect(3, "Scrim", 0, 0, SLIDE_W, SLIDE_H, DEEP))  # solid scrim — replaces image. We want overlay; PPTX needs alpha — supply alpha via solidFill alpha.
    return _build_thanks_with_alpha(slide, media_rid)

def _build_thanks_with_alpha(slide, media_rid):
    """Same as above but uses an alpha-tinted overlay for proper photo + text legibility."""
    s = []
    s.append(picture(2, "Bleed", media_rid, 0, 0, SLIDE_W, SLIDE_H))
    # Scrim with alpha 70%
    scrim = (
        f'<p:sp><p:nvSpPr><p:cNvPr id="3" name="Scrim"/>'
        f'<p:cNvSpPr/><p:nvPr/></p:nvSpPr>'
        f'<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="{SLIDE_W}" cy="{SLIDE_H}"/></a:xfrm>'
        f'<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>'
        f'<a:solidFill><a:srgbClr val="{DEEP}"><a:alpha val="78000"/></a:srgbClr></a:solidFill>'
        f'</p:spPr>'
        f'<p:txBody><a:bodyPr/><a:lstStyle/>{empty_paragraph()}</p:txBody></p:sp>'
    )
    s.append(scrim)
    # Coral hairline accent
    s.append(shape_rect(4, "Bar", SLIDE_W // 2 - emu(0.5), SLIDE_H // 2 + emu(1.3), emu(1.0), emu(0.06), CORAL))
    # Title
    title = paragraph(slide["title"], size_pt=96, bold=True, color=PAPER, align="ctr")
    s.append(textbox(5, "T", 0, emu(2.0), SLIDE_W, emu(1.7), title))
    # Subtitle
    sub = paragraph(slide["subtitle"], size_pt=22, color="E8E8E8", align="ctr", italic=True)
    s.append(textbox(6, "Sub", 0, emu(3.9), SLIDE_W, emu(0.7), sub))
    # Footer
    foot = paragraph(slide["footer"].upper(), size_pt=14, bold=True, color=CORAL, align="ctr")
    s.append(textbox(7, "Foot", 0, SLIDE_H // 2 + emu(1.45), SLIDE_W, emu(0.5), foot))
    return slide_xml("".join(s))


# ---------- PPTX assembly ----------
CONTENT_TYPES = lambda n_slides, media_exts: f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
{"".join(f'<Default Extension="{ext}" ContentType="image/{("jpeg" if ext=="jpg" else ext)}"/>' for ext in media_exts)}
<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
{"".join(f'<Override PartName="/ppt/slides/slide{i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>' for i in range(n_slides))}
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>'''

ROOT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>'''

CORE_XML = lambda title: f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:title>{escape(title)}</dc:title>
<dc:creator>Trip Planner Team</dc:creator>
<cp:lastModifiedBy>Trip Planner Team</cp:lastModifiedBy>
<dcterms:created xsi:type="dcterms:W3CDTF">{datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">{datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")}</dcterms:modified>
</cp:coreProperties>'''

APP_XML = lambda n_slides: f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>Trip Planner Builder v2</Application>
<Slides>{n_slides}</Slides>
<PresentationFormat>Widescreen</PresentationFormat>
<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Trip Planner Graduation — Design v2</vt:lpstr></vt:vector></TitlesOfParts>
</Properties>'''

PRESENTATION_XML = lambda n_slides: f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation {NSMAP} saveSubsetFonts="1">
<p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
<p:sldIdLst>
{"".join(f'<p:sldId id="{256+i}" r:id="rId{i+2}"/>' for i in range(n_slides))}
</p:sldIdLst>
<p:sldSz cx="{SLIDE_W}" cy="{SLIDE_H}" type="screen16x9"/>
<p:notesSz cx="6858000" cy="9144000"/>
<p:defaultTextStyle/>
</p:presentation>'''

PRESENTATION_RELS = lambda n_slides: f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
{"".join(f'<Relationship Id="rId{i+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{i+1}.xml"/>' for i in range(n_slides))}
<Relationship Id="rId{n_slides+2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>'''

def slide_rels_xml(image_targets):
    """image_targets is a list of (rid, target_path) tuples relative to slide xml location."""
    parts = ['<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
             '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
             '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>']
    for rid, target in image_targets:
        parts.append(f'<Relationship Id="{rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="{target}"/>')
    parts.append('</Relationships>')
    return "".join(parts)

SLIDE_LAYOUT = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout {NSMAP} type="blank" preserve="1">
<p:cSld name="Blank">
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree>
</p:cSld>
<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>'''

SLIDE_LAYOUT_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>'''

SLIDE_MASTER = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster {NSMAP}>
<p:cSld>
<p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
<p:spTree>
<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
</p:spTree>
</p:cSld>
<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
<p:txStyles>
<p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="3200" b="1"><a:solidFill><a:srgbClr val="0F2A2E"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:lvl1pPr></p:titleStyle>
<p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"><a:solidFill><a:srgbClr val="1F2937"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:lvl1pPr></p:bodyStyle>
<p:otherStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:otherStyle>
</p:txStyles>
</p:sldMaster>'''

SLIDE_MASTER_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>'''

THEME_XML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Trip Planner v2">
<a:themeElements>
<a:clrScheme name="Trip Planner v2">
<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="0F2A2E"/></a:dk2>
<a:lt2><a:srgbClr val="FAF6F0"/></a:lt2>
<a:accent1><a:srgbClr val="0D7B6F"/></a:accent1>
<a:accent2><a:srgbClr val="FF6F61"/></a:accent2>
<a:accent3><a:srgbClr val="0F2A2E"/></a:accent3>
<a:accent4><a:srgbClr val="6B7280"/></a:accent4>
<a:accent5><a:srgbClr val="E5E7EB"/></a:accent5>
<a:accent6><a:srgbClr val="F3F1EC"/></a:accent6>
<a:hlink><a:srgbClr val="0D7B6F"/></a:hlink>
<a:folHlink><a:srgbClr val="FF6F61"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Trip Planner v2">
<a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>
<a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont>
</a:fontScheme>
<a:fmtScheme name="Office">
<a:fillStyleLst>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
</a:fillStyleLst>
<a:lnStyleLst>
<a:ln w="9525" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
<a:ln w="25400" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
<a:ln w="38100" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
</a:lnStyleLst>
<a:effectStyleLst>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle>
<a:effectStyle><a:effectLst/></a:effectStyle>
</a:effectStyleLst>
<a:bgFillStyleLst>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
<a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
</a:bgFillStyleLst>
</a:fmtScheme>
</a:themeElements>
</a:theme>'''


def render_slide(slide, page_num, total, image_rid=None):
    t = slide["type"]
    if t == "cover":           return build_cover(slide, image_rid)
    if t == "section":         return build_section(slide, page_num, total)
    if t == "content_lead":    return build_content_lead(slide, page_num, total)
    if t == "objectives_grid": return build_objectives_grid(slide, page_num, total)
    if t == "two_col_pairs":   return build_two_col_pairs(slide, page_num, total)
    if t == "architecture":    return build_architecture(slide, page_num, total)
    if t == "tech_grid":       return build_tech_grid(slide, page_num, total)
    if t == "image_split":     return build_image_split(slide, page_num, total, image_rid)
    if t == "flow":            return build_flow(slide, page_num, total)
    if t == "itinerary":       return build_itinerary(slide, page_num, total, image_rid)
    if t == "screenshot":      return build_screenshot(slide, page_num, total, image_rid)
    if t == "thanks":          return _build_thanks_with_alpha(slide, image_rid)
    raise ValueError(f"Unknown slide type: {t}")


def main():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "Trip_Planner_Graduation_Presentation_v2.pptx")
    slides = _assemble_slides()
    n = len(slides)

    # Collect all images and assign deterministic media file names
    media = {}      # abs_path -> (media_filename, ext)
    media_order = []
    def _register(path):
        if path in media:
            return media[path][0]
        ext = os.path.splitext(path)[1].lstrip(".").lower()
        if ext == "jpeg":
            ext = "jpg"
        idx = len(media) + 1
        fname = f"image{idx}.{ext}"
        media[path] = (fname, ext)
        media_order.append(path)
        return fname

    # Pre-register every image used by every slide
    for s in slides:
        if "image" in s:
            _register(s["image"])

    media_exts = sorted({ext for (_, ext) in media.values()})

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES(n, media_exts))
        z.writestr("_rels/.rels", ROOT_RELS)
        z.writestr("docProps/core.xml", CORE_XML("Trip Planner — Graduation Project (v2)"))
        z.writestr("docProps/app.xml", APP_XML(n))
        z.writestr("ppt/presentation.xml", PRESENTATION_XML(n))
        z.writestr("ppt/_rels/presentation.xml.rels", PRESENTATION_RELS(n))
        z.writestr("ppt/theme/theme1.xml", THEME_XML)
        z.writestr("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER)
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", SLIDE_MASTER_RELS)
        z.writestr("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT)
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", SLIDE_LAYOUT_RELS)

        # Embed media binaries
        for path in media_order:
            fname, _ext = media[path]
            with open(path, "rb") as fh:
                z.writestr(f"ppt/media/{fname}", fh.read())

        # Slides
        for i, s in enumerate(slides):
            page_num = i + 1
            image_targets = []
            image_rid = None
            if "image" in s:
                fname, _ext = media[s["image"]]
                image_rid = "rId10"
                image_targets.append((image_rid, f"../media/{fname}"))
            xml = render_slide(s, page_num, n, image_rid=image_rid)
            z.writestr(f"ppt/slides/slide{i+1}.xml", xml)
            z.writestr(f"ppt/slides/_rels/slide{i+1}.xml.rels", slide_rels_xml(image_targets))

    print(f"Created: {out_path}")
    print(f"Slides : {n}")
    print(f"Media  : {len(media)} image(s) embedded")


if __name__ == "__main__":
    main()
