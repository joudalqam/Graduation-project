"""
Standalone PPTX builder for the Trip Planner graduation presentation.
Uses only the Python standard library (zipfile + xml strings).
Run once to produce Trip_Planner_Graduation_Presentation.pptx
"""

import os
import zipfile
from datetime import datetime
from xml.sax.saxutils import escape

# ---------- Theme colors (navy + teal/gold accent) ----------
PRIMARY = "0B3D5C"       # deep navy
PRIMARY_DARK = "07263A"  # darker navy
ACCENT = "F2A65A"        # warm orange/gold
ACCENT2 = "27B5B0"       # teal
LIGHT_BG = "F4F7FA"      # off-white panel
TEXT_DARK = "1A2A38"
TEXT_MUTED = "5A6B7A"
WHITE = "FFFFFF"

# Slide size: 13.333 x 7.5 inches (widescreen 16:9) in EMU (914400 per inch)
SLIDE_W = 12192000
SLIDE_H = 6858000

# ---------- Slide content ----------
SLIDES = [
    # 1. Cover
    {
        "type": "cover",
        "title": "Trip Planner",
        "subtitle": "AI-Powered Smart Travel Planning System",
        "tagline": "Graduation Project",
    },
    # 2. Problem Statement
    {
        "type": "content",
        "title": "Problem Statement",
        "intro": "Planning a trip is time-consuming, fragmented, and rarely personalized.",
        "bullets": [
            "Travelers juggle many tools: maps, reviews, blogs, booking sites.",
            "Generic recommendations ignore budget, group type, and personal taste.",
            "Building a realistic day-by-day itinerary takes hours of manual work.",
            "Distance, timing, and cost trade-offs are hard to balance manually.",
            "No single platform combines planning, recommendations, and reservations.",
        ],
    },
    # 3. Proposed Solution
    {
        "type": "content",
        "title": "Proposed Solution",
        "intro": "An intelligent travel companion that builds personalized trips in seconds.",
        "bullets": [
            "User enters destination, duration, budget, trip type, and travelers.",
            "AI engine generates a complete, optimized day-by-day itinerary.",
            "Smart recommendations powered by Google Maps and Google Places APIs.",
            "Interactive map with markers, distances, and routes between stops.",
            "WhatsApp integration for reservations and trip reminders.",
            "All trips stored securely in the database for history and reuse.",
        ],
    },
    # 4. Project Objectives
    {
        "type": "content",
        "title": "Project Objectives",
        "intro": "Deliver a complete, intelligent, end-to-end travel planning platform.",
        "bullets": [
            "Automate itinerary creation tailored to user preferences.",
            "Integrate authoritative location data through Google APIs.",
            "Apply ranking and AI logic to refine recommendations.",
            "Provide a clean, responsive, user-friendly interface.",
            "Enable real-world actions: reservations and reminders via WhatsApp.",
            "Persist user data, trips, and preferences in a robust database.",
        ],
    },
    # 5. System Features
    {
        "type": "two_col",
        "title": "System Features",
        "left_title": "Trip Inputs",
        "left_items": [
            "Destination",
            "Trip duration",
            "Budget level (Low / Medium / High)",
            "Trip type (Family, Adventure, Romantic, Cultural, Relaxation)",
            "Number of travelers",
        ],
        "right_title": "Smart Outputs",
        "right_items": [
            "Personalized daily itinerary",
            "Recommended attractions, restaurants & cafes",
            "Interactive map with markers & distances",
            "Budget-aware alternative suggestions",
            "WhatsApp reservation & reminder messages",
            "Saved trip history per user",
        ],
    },
    # 6. System Architecture
    {
        "type": "content",
        "title": "System Architecture",
        "intro": "A clean three-tier architecture connecting users, services, and data.",
        "bullets": [
            "Presentation Layer  -  Responsive web frontend (HTML, CSS, JavaScript).",
            "Application Layer  -  Node.js + Express.js REST API server.",
            "Intelligence Layer  -  AI recommendation engine and ranking algorithm.",
            "Integration Layer  -  Google Maps API, Google Places API, WhatsApp.",
            "Data Layer  -  MongoDB for users, trips, preferences, and history.",
        ],
    },
    # 7. Technologies Used
    {
        "type": "tech",
        "title": "Technologies Used",
        "groups": [
            ("Frontend", ["HTML5", "CSS3", "JavaScript", "Responsive UI"]),
            ("Backend", ["Node.js", "Express.js", "REST API"]),
            ("Database", ["MongoDB", "Mongoose ODM"]),
            ("APIs & Services", ["Google Maps API", "Google Places API", "WhatsApp API"]),
            ("Intelligence", ["AI Recommendation Engine", "Ranking Algorithm"]),
            ("Tooling", ["Git & GitHub", "VS Code", "Postman"]),
        ],
    },
    # 8. Google Maps & Places Integration
    {
        "type": "content",
        "title": "Google Maps & Places Integration",
        "intro": "Real-world location intelligence at the heart of every recommendation.",
        "bullets": [
            "Google Places API supplies attractions, restaurants, cafes, and ratings.",
            "Google Maps API renders an interactive map with custom markers.",
            "Distance Matrix API calculates travel time between every two stops.",
            "Photos, opening hours, and reviews enrich each recommended place.",
            "Geocoding converts user destinations into precise coordinates.",
        ],
    },
    # 9. Place Ranking Algorithm
    {
        "type": "content",
        "title": "Place Ranking Algorithm",
        "intro": "A weighted scoring model that orders places by real user fit.",
        "bullets": [
            "Inputs: budget level, trip type, traveler count, and place metadata.",
            "Each candidate place receives scores for relevance, rating, distance, and price.",
            "Weights adjust dynamically based on the chosen trip type.",
            "Top-ranked places are slotted into the daily itinerary by proximity.",
            "Lower-ranked items are kept as budget-aware alternative suggestions.",
        ],
    },
    # 10. AI Recommendation Engine
    {
        "type": "content",
        "title": "AI Recommendation Engine",
        "intro": "An intelligent layer that personalizes every itinerary.",
        "bullets": [
            "Learns from user preferences, trip type, and historical trips.",
            "Generates context-aware suggestions for places, food, and activities.",
            "Balances variety, distance, and budget across each day.",
            "Produces natural-language descriptions for every recommended stop.",
            "Continuously refines results as more user data is collected.",
        ],
    },
    # 11. WhatsApp Integration
    {
        "type": "content",
        "title": "WhatsApp Integration",
        "intro": "Bringing the trip directly into the user's most-used messaging app.",
        "bullets": [
            "Send reservation requests to restaurants and venues with one tap.",
            "Receive automated trip reminders before each scheduled activity.",
            "Share the full itinerary instantly with family or travel companions.",
            "Confirm bookings and updates through familiar WhatsApp chat flow.",
            "Reduces friction between planning and real-world action.",
        ],
    },
    # 12. Database Structure
    {
        "type": "two_col",
        "title": "Database Structure (MongoDB)",
        "left_title": "Core Collections",
        "left_items": [
            "Users  -  profile, credentials, contact info",
            "Preferences  -  trip type, budget, interests",
            "Trips  -  destination, duration, travelers, status",
            "Itineraries  -  day-by-day plan with places",
            "Places  -  cached Google Places data",
            "Reservations  -  WhatsApp request records",
        ],
        "right_title": "Key Relationships",
        "right_items": [
            "One user has many trips",
            "Each trip has one itinerary",
            "Each itinerary contains many places per day",
            "Preferences feed the AI ranking engine",
            "Reservations link users to specific places",
            "History enables smarter future recommendations",
        ],
    },
    # 13. Sample User Flow
    {
        "type": "flow",
        "title": "Sample User Flow",
        "steps": [
            "Sign In",
            "Enter Trip Details",
            "AI Generates Itinerary",
            "Review on Interactive Map",
            "Reserve via WhatsApp",
            "Save & Share Trip",
        ],
    },
    # 14. Example Generated Itinerary
    {
        "type": "itinerary",
        "title": "Example Generated Itinerary",
        "subtitle": "Destination: Istanbul   |   Duration: 3 Days   |   Budget: Medium   |   Type: Cultural",
        "days": [
            ("Day 1  -  Historic Heart",
             ["Hagia Sophia", "Blue Mosque", "Lunch at Sultanahmet Koftecisi", "Topkapi Palace", "Sunset at Galata Bridge"]),
            ("Day 2  -  Bazaars & Bosphorus",
             ["Grand Bazaar", "Spice Bazaar", "Bosphorus Cruise", "Dinner in Karakoy", "Coffee at a rooftop cafe"]),
            ("Day 3  -  Modern Istanbul",
             ["Dolmabahce Palace", "Istiklal Street walk", "Lunch in Taksim", "Galata Tower view", "Farewell dinner by the sea"]),
        ],
    },
    # 15. Future Scalability
    {
        "type": "content",
        "title": "Future Scalability",
        "intro": "Built on a foundation ready to grow with users and features.",
        "bullets": [
            "Multi-language support for international travelers.",
            "Native mobile applications for iOS and Android.",
            "Direct booking integrations with hotels and flights.",
            "Group trip collaboration with shared itineraries.",
            "Advanced AI personalization driven by larger user datasets.",
            "Cloud-scale deployment with caching and load balancing.",
        ],
    },
    # 16. Conclusion / Thank You
    {
        "type": "thanks",
        "title": "Thank You",
        "subtitle": "Trip Planner  -  Smarter trips, effortlessly planned.",
        "footer": "Questions & Discussion",
    },
]

# ---------- XML helpers ----------

NSMAP = (
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
    'xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"'
)


def emu(inches):
    return int(inches * 914400)


def text_run(text, size_pt, bold=False, color=WHITE, font="Calibri"):
    b = ' b="1"' if bold else ""
    return (
        f'<a:r><a:rPr lang="en-US" sz="{int(size_pt*100)}"{b} dirty="0">'
        f'<a:solidFill><a:srgbClr val="{color}"/></a:solidFill>'
        f'<a:latin typeface="{font}"/></a:rPr>'
        f'<a:t>{escape(text)}</a:t></a:r>'
    )


def paragraph(text, size_pt=18, bold=False, color=TEXT_DARK, bullet=False, align="l", font="Calibri", spacing_before=0):
    bu = ""
    indent = ""
    if bullet:
        bu = '<a:buFont typeface="Arial"/><a:buChar char="&#8226;"/>'
        indent = ' indent="-228600" marL="228600"'
    spc = f'<a:spcBef><a:spcPts val="{spacing_before}"/></a:spcBef>' if spacing_before else ""
    return (
        f'<a:p><a:pPr algn="{align}"{indent}>{spc}{bu}</a:pPr>'
        f'{text_run(text, size_pt, bold=bold, color=color, font=font)}'
        f'</a:p>'
    )


def empty_paragraph():
    return '<a:p><a:endParaRPr lang="en-US"/></a:p>'


def shape_rect(sp_id, name, x, y, cx, cy, fill_color, body_xml="", line_color=None, prst="rect"):
    line = ""
    if line_color:
        line = f'<a:ln w="12700"><a:solidFill><a:srgbClr val="{line_color}"/></a:solidFill></a:ln>'
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


def slide_xml(shapes_xml, bg_color=WHITE):
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


# ---------- Slide builders ----------

def header_band(start_id, title, page_num=None, total=None):
    """Top color band with title + accent stripe + page number."""
    shapes = []
    # Accent thin top stripe
    shapes.append(shape_rect(start_id, "TopStripe", 0, 0, SLIDE_W, emu(0.18), ACCENT))
    # Title
    title_body = paragraph(title, size_pt=32, bold=True, color=PRIMARY, align="l")
    shapes.append(textbox(start_id + 1, "SlideTitle", emu(0.6), emu(0.35), SLIDE_W - emu(2.0), emu(0.9), title_body, anchor="t"))
    # Underline accent
    shapes.append(shape_rect(start_id + 2, "TitleAccent", emu(0.6), emu(1.15), emu(0.9), emu(0.06), ACCENT2))
    # Page number
    if page_num and total:
        pn_body = paragraph(f"{page_num:02d} / {total:02d}", size_pt=11, bold=True, color=TEXT_MUTED, align="r")
        shapes.append(textbox(start_id + 3, "PageNum", SLIDE_W - emu(1.6), emu(0.45), emu(1.2), emu(0.4), pn_body, anchor="t"))
    # Footer line
    shapes.append(shape_rect(start_id + 4, "FooterStripe", 0, SLIDE_H - emu(0.06), SLIDE_W, emu(0.06), PRIMARY))
    # Footer label
    foot = paragraph("Trip Planner  |  Graduation Project", size_pt=10, color=TEXT_MUTED, align="l")
    shapes.append(textbox(start_id + 5, "FooterLabel", emu(0.6), SLIDE_H - emu(0.45), emu(8), emu(0.3), foot, anchor="t"))
    return "".join(shapes), start_id + 6


def build_cover(slide):
    shapes = []
    # Full background navy
    shapes.append(shape_rect(2, "BG", 0, 0, SLIDE_W, SLIDE_H, PRIMARY))
    # Diagonal accent block (top-right rectangle)
    shapes.append(shape_rect(3, "AccentBlock", SLIDE_W - emu(4.5), 0, emu(4.5), SLIDE_H, PRIMARY_DARK))
    # Accent vertical bar
    shapes.append(shape_rect(4, "AccentBar", emu(0.8), emu(2.6), emu(0.12), emu(2.4), ACCENT))
    # Tagline
    tag_body = paragraph(slide["tagline"].upper(), size_pt=14, bold=True, color=ACCENT, align="l")
    shapes.append(textbox(5, "Tagline", emu(1.1), emu(2.4), emu(8), emu(0.5), tag_body, anchor="t"))
    # Title
    title_body = paragraph(slide["title"], size_pt=72, bold=True, color=WHITE, align="l")
    shapes.append(textbox(6, "Title", emu(1.1), emu(2.9), emu(10), emu(1.6), title_body, anchor="t"))
    # Subtitle
    sub_body = paragraph(slide["subtitle"], size_pt=24, color="DDE7EF", align="l")
    shapes.append(textbox(7, "Subtitle", emu(1.1), emu(4.5), emu(10), emu(1.0), sub_body, anchor="t"))
    # Bottom info
    info_body = paragraph(f"Presented  |  {datetime.now().year}", size_pt=12, color="9FB3C2", align="l")
    shapes.append(textbox(8, "Info", emu(1.1), SLIDE_H - emu(0.9), emu(8), emu(0.4), info_body, anchor="t"))
    # Decorative circles (right block)
    shapes.append(shape_rect(9, "Circle1", SLIDE_W - emu(2.6), emu(0.9), emu(1.6), emu(1.6), ACCENT, prst="ellipse"))
    shapes.append(shape_rect(10, "Circle2", SLIDE_W - emu(1.4), emu(5.0), emu(0.9), emu(0.9), ACCENT2, prst="ellipse"))
    return slide_xml("".join(shapes), bg_color=PRIMARY)


def build_content(slide, page_num, total):
    shapes_str, next_id = header_band(2, slide["title"], page_num, total)
    shapes = [shapes_str]
    # Intro paragraph
    intro_body = paragraph(slide["intro"], size_pt=18, bold=True, color=ACCENT2, align="l")
    shapes.append(textbox(next_id, "Intro", emu(0.6), emu(1.45), SLIDE_W - emu(1.2), emu(0.7), intro_body, anchor="t"))
    next_id += 1
    # Bullet panel background
    shapes.append(shape_rect(next_id, "Panel", emu(0.6), emu(2.25), SLIDE_W - emu(1.2), emu(4.4), LIGHT_BG))
    next_id += 1
    # Bullets
    paras = []
    for b in slide["bullets"]:
        paras.append(paragraph(b, size_pt=16, color=TEXT_DARK, bullet=True, align="l", spacing_before=600))
    body = "".join(paras)
    shapes.append(textbox(next_id, "Bullets", emu(1.0), emu(2.45), SLIDE_W - emu(2.0), emu(4.0), body, anchor="t"))
    return slide_xml("".join(shapes))


def build_two_col(slide, page_num, total):
    shapes_str, next_id = header_band(2, slide["title"], page_num, total)
    shapes = [shapes_str]

    col_w = (SLIDE_W - emu(1.8)) // 2
    col_h = emu(4.6)
    col_y = emu(1.7)

    # Left column
    shapes.append(shape_rect(next_id, "LeftPanel", emu(0.6), col_y, col_w, col_h, LIGHT_BG))
    next_id += 1
    shapes.append(shape_rect(next_id, "LeftHeader", emu(0.6), col_y, col_w, emu(0.6), PRIMARY))
    next_id += 1
    lh = paragraph(slide["left_title"], size_pt=18, bold=True, color=WHITE, align="l")
    shapes.append(textbox(next_id, "LeftHeaderText", emu(0.85), col_y + emu(0.07), col_w - emu(0.5), emu(0.5), lh, anchor="ctr"))
    next_id += 1
    left_body = "".join(
        paragraph(item, size_pt=14, color=TEXT_DARK, bullet=True, align="l", spacing_before=500)
        for item in slide["left_items"]
    )
    shapes.append(textbox(next_id, "LeftItems", emu(0.95), col_y + emu(0.85), col_w - emu(0.5), col_h - emu(1.0), left_body, anchor="t"))
    next_id += 1

    # Right column
    rx = emu(0.6) + col_w + emu(0.6)
    shapes.append(shape_rect(next_id, "RightPanel", rx, col_y, col_w, col_h, LIGHT_BG))
    next_id += 1
    shapes.append(shape_rect(next_id, "RightHeader", rx, col_y, col_w, emu(0.6), ACCENT2))
    next_id += 1
    rh = paragraph(slide["right_title"], size_pt=18, bold=True, color=WHITE, align="l")
    shapes.append(textbox(next_id, "RightHeaderText", rx + emu(0.25), col_y + emu(0.07), col_w - emu(0.5), emu(0.5), rh, anchor="ctr"))
    next_id += 1
    right_body = "".join(
        paragraph(item, size_pt=14, color=TEXT_DARK, bullet=True, align="l", spacing_before=500)
        for item in slide["right_items"]
    )
    shapes.append(textbox(next_id, "RightItems", rx + emu(0.35), col_y + emu(0.85), col_w - emu(0.5), col_h - emu(1.0), right_body, anchor="t"))
    next_id += 1

    return slide_xml("".join(shapes))


def build_tech(slide, page_num, total):
    shapes_str, next_id = header_band(2, slide["title"], page_num, total)
    shapes = [shapes_str]

    # 3 x 2 grid of tech category cards
    cols = 3
    rows = 2
    margin_x = emu(0.6)
    margin_y = emu(1.6)
    gap = emu(0.25)
    avail_w = SLIDE_W - margin_x * 2
    avail_h = SLIDE_H - margin_y - emu(0.7)
    card_w = (avail_w - gap * (cols - 1)) // cols
    card_h = (avail_h - gap * (rows - 1)) // rows

    accent_colors = [PRIMARY, ACCENT2, ACCENT, PRIMARY, ACCENT2, ACCENT]
    for idx, (group_name, items) in enumerate(slide["groups"]):
        r = idx // cols
        c = idx % cols
        x = margin_x + c * (card_w + gap)
        y = margin_y + r * (card_h + gap)
        # Card background
        shapes.append(shape_rect(next_id, f"Card{idx}", x, y, card_w, card_h, LIGHT_BG))
        next_id += 1
        # Top color strip
        shapes.append(shape_rect(next_id, f"CardStrip{idx}", x, y, card_w, emu(0.12), accent_colors[idx]))
        next_id += 1
        # Title
        gh = paragraph(group_name, size_pt=18, bold=True, color=PRIMARY, align="l")
        shapes.append(textbox(next_id, f"CardTitle{idx}", x + emu(0.25), y + emu(0.25), card_w - emu(0.5), emu(0.5), gh, anchor="t"))
        next_id += 1
        # Items
        items_body = "".join(
            paragraph(it, size_pt=13, color=TEXT_DARK, bullet=True, align="l", spacing_before=400)
            for it in items
        )
        shapes.append(textbox(next_id, f"CardItems{idx}", x + emu(0.35), y + emu(0.85), card_w - emu(0.6), card_h - emu(1.0), items_body, anchor="t"))
        next_id += 1

    return slide_xml("".join(shapes))


def build_flow(slide, page_num, total):
    shapes_str, next_id = header_band(2, slide["title"], page_num, total)
    shapes = [shapes_str]

    steps = slide["steps"]
    n = len(steps)
    margin_x = emu(0.6)
    avail_w = SLIDE_W - margin_x * 2
    arrow_w = emu(0.35)
    box_h = emu(1.1)
    # rows of 3
    per_row = 3
    rows = (n + per_row - 1) // per_row
    row_gap = emu(0.6)
    total_h = rows * box_h + (rows - 1) * row_gap
    start_y = (SLIDE_H - emu(1.5) - total_h) // 2 + emu(1.5)

    colors = [PRIMARY, ACCENT2, ACCENT, PRIMARY, ACCENT2, ACCENT]
    for r in range(rows):
        row_steps = steps[r * per_row:(r + 1) * per_row]
        m = len(row_steps)
        gap = emu(0.4)
        box_w = (avail_w - gap * (m - 1) - arrow_w * (m - 1)) // m
        y = start_y + r * (box_h + row_gap)
        for i, step in enumerate(row_steps):
            x = margin_x + i * (box_w + gap + arrow_w)
            color = colors[(r * per_row + i) % len(colors)]
            shapes.append(shape_rect(next_id, f"Step{r}{i}", x, y, box_w, box_h, color, prst="roundRect"))
            next_id += 1
            num_body = paragraph(f"{r * per_row + i + 1:02d}", size_pt=12, bold=True, color=WHITE, align="l")
            shapes.append(textbox(next_id, f"StepNum{r}{i}", x + emu(0.2), y + emu(0.1), emu(0.6), emu(0.3), num_body, anchor="t"))
            next_id += 1
            label_body = paragraph(step, size_pt=16, bold=True, color=WHITE, align="ctr")
            shapes.append(textbox(next_id, f"StepLabel{r}{i}", x, y + emu(0.35), box_w, emu(0.7), label_body, anchor="ctr"))
            next_id += 1
            # arrow
            if i < m - 1:
                ax = x + box_w
                ay = y + box_h // 2 - emu(0.1)
                shapes.append(shape_rect(next_id, f"Arrow{r}{i}", ax, ay, arrow_w, emu(0.2), TEXT_MUTED, prst="rightArrow"))
                next_id += 1

    return slide_xml("".join(shapes))


def build_itinerary(slide, page_num, total):
    shapes_str, next_id = header_band(2, slide["title"], page_num, total)
    shapes = [shapes_str]
    # Subtitle
    sub_body = paragraph(slide["subtitle"], size_pt=14, bold=True, color=ACCENT2, align="l")
    shapes.append(textbox(next_id, "Sub", emu(0.6), emu(1.45), SLIDE_W - emu(1.2), emu(0.5), sub_body, anchor="t"))
    next_id += 1

    # Three column day cards
    days = slide["days"]
    n = len(days)
    margin_x = emu(0.6)
    gap = emu(0.3)
    avail_w = SLIDE_W - margin_x * 2
    card_w = (avail_w - gap * (n - 1)) // n
    card_y = emu(2.05)
    card_h = SLIDE_H - card_y - emu(0.7)

    colors = [PRIMARY, ACCENT2, ACCENT]
    for i, (day_title, items) in enumerate(days):
        x = margin_x + i * (card_w + gap)
        shapes.append(shape_rect(next_id, f"DayCard{i}", x, card_y, card_w, card_h, LIGHT_BG))
        next_id += 1
        shapes.append(shape_rect(next_id, f"DayHead{i}", x, card_y, card_w, emu(0.7), colors[i % len(colors)]))
        next_id += 1
        dh = paragraph(day_title, size_pt=15, bold=True, color=WHITE, align="l")
        shapes.append(textbox(next_id, f"DayTitle{i}", x + emu(0.25), card_y + emu(0.13), card_w - emu(0.5), emu(0.55), dh, anchor="ctr"))
        next_id += 1
        items_body = "".join(
            paragraph(it, size_pt=13, color=TEXT_DARK, bullet=True, align="l", spacing_before=500)
            for it in items
        )
        shapes.append(textbox(next_id, f"DayItems{i}", x + emu(0.3), card_y + emu(0.95), card_w - emu(0.6), card_h - emu(1.1), items_body, anchor="t"))
        next_id += 1

    return slide_xml("".join(shapes))


def build_thanks(slide):
    shapes = []
    shapes.append(shape_rect(2, "BG", 0, 0, SLIDE_W, SLIDE_H, PRIMARY))
    shapes.append(shape_rect(3, "AccentBar", 0, SLIDE_H // 2 + emu(1.2), SLIDE_W, emu(0.12), ACCENT))
    title_body = paragraph(slide["title"], size_pt=84, bold=True, color=WHITE, align="ctr")
    shapes.append(textbox(4, "ThankTitle", 0, emu(2.4), SLIDE_W, emu(1.5), title_body, anchor="t"))
    sub_body = paragraph(slide["subtitle"], size_pt=22, color="DDE7EF", align="ctr")
    shapes.append(textbox(5, "ThankSub", 0, emu(4.0), SLIDE_W, emu(0.7), sub_body, anchor="t"))
    foot = paragraph(slide["footer"].upper(), size_pt=14, bold=True, color=ACCENT, align="ctr")
    shapes.append(textbox(6, "ThankFoot", 0, SLIDE_H // 2 + emu(1.6), SLIDE_W, emu(0.5), foot, anchor="t"))
    # Decorative dots
    shapes.append(shape_rect(7, "DotL", emu(1.0), SLIDE_H - emu(1.0), emu(0.4), emu(0.4), ACCENT2, prst="ellipse"))
    shapes.append(shape_rect(8, "DotR", SLIDE_W - emu(1.4), emu(0.7), emu(0.4), emu(0.4), ACCENT, prst="ellipse"))
    return slide_xml("".join(shapes), bg_color=PRIMARY)


# ---------- PPTX assembly ----------

CONTENT_TYPES = lambda n_slides: f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
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
<Application>Trip Planner Builder</Application>
<Slides>{n_slides}</Slides>
<PresentationFormat>Widescreen</PresentationFormat>
<TitlesOfParts><vt:vector size="1" baseType="lpstr"><vt:lpstr>Trip Planner Graduation Project</vt:lpstr></vt:vector></TitlesOfParts>
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

SLIDE_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>'''

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
<p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="3200" b="1"><a:solidFill><a:srgbClr val="0B3D5C"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:lvl1pPr></p:titleStyle>
<p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"><a:solidFill><a:srgbClr val="1A2A38"/></a:solidFill><a:latin typeface="Calibri"/></a:defRPr></a:lvl1pPr></p:bodyStyle>
<p:otherStyle><a:defPPr><a:defRPr lang="en-US"/></a:defPPr></p:otherStyle>
</p:txStyles>
</p:sldMaster>'''

SLIDE_MASTER_RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>'''

THEME_XML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Trip Planner">
<a:themeElements>
<a:clrScheme name="Trip Planner">
<a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
<a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
<a:dk2><a:srgbClr val="0B3D5C"/></a:dk2>
<a:lt2><a:srgbClr val="F4F7FA"/></a:lt2>
<a:accent1><a:srgbClr val="0B3D5C"/></a:accent1>
<a:accent2><a:srgbClr val="27B5B0"/></a:accent2>
<a:accent3><a:srgbClr val="F2A65A"/></a:accent3>
<a:accent4><a:srgbClr val="07263A"/></a:accent4>
<a:accent5><a:srgbClr val="DDE7EF"/></a:accent5>
<a:accent6><a:srgbClr val="9FB3C2"/></a:accent6>
<a:hlink><a:srgbClr val="27B5B0"/></a:hlink>
<a:folHlink><a:srgbClr val="F2A65A"/></a:folHlink>
</a:clrScheme>
<a:fontScheme name="Trip Planner">
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


def render_slide(idx, slide, total):
    page_num = idx + 1
    t = slide["type"]
    if t == "cover":
        return build_cover(slide)
    if t == "thanks":
        return build_thanks(slide)
    if t == "content":
        return build_content(slide, page_num, total)
    if t == "two_col":
        return build_two_col(slide, page_num, total)
    if t == "tech":
        return build_tech(slide, page_num, total)
    if t == "flow":
        return build_flow(slide, page_num, total)
    if t == "itinerary":
        return build_itinerary(slide, page_num, total)
    raise ValueError(f"Unknown slide type: {t}")


def main():
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_path = os.path.join(out_dir, "Trip_Planner_Graduation_Presentation.pptx")
    n = len(SLIDES)

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CONTENT_TYPES(n))
        z.writestr("_rels/.rels", ROOT_RELS)
        z.writestr("docProps/core.xml", CORE_XML("Trip Planner - Graduation Project"))
        z.writestr("docProps/app.xml", APP_XML(n))
        z.writestr("ppt/presentation.xml", PRESENTATION_XML(n))
        z.writestr("ppt/_rels/presentation.xml.rels", PRESENTATION_RELS(n))
        z.writestr("ppt/theme/theme1.xml", THEME_XML)
        z.writestr("ppt/slideMasters/slideMaster1.xml", SLIDE_MASTER)
        z.writestr("ppt/slideMasters/_rels/slideMaster1.xml.rels", SLIDE_MASTER_RELS)
        z.writestr("ppt/slideLayouts/slideLayout1.xml", SLIDE_LAYOUT)
        z.writestr("ppt/slideLayouts/_rels/slideLayout1.xml.rels", SLIDE_LAYOUT_RELS)
        for i, slide in enumerate(SLIDES):
            z.writestr(f"ppt/slides/slide{i+1}.xml", render_slide(i, slide, n))
            z.writestr(f"ppt/slides/_rels/slide{i+1}.xml.rels", SLIDE_RELS)

    print(f"Created: {out_path}")
    print(f"Slides : {n}")


if __name__ == "__main__":
    main()
